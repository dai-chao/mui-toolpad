import { Emitter } from '@mui/toolpad-utils/events';
import { QueryClient, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import * as React from 'react';
import { useNonNullableContext } from '@mui/toolpad-utils/react';
import invariant from 'invariant';
import { ProjectEvents } from './types';
import { ServerDefinition } from './server/projectRpcServer';
import { createRpcApi } from './rpcClient';

async function fetchAppDevManifest(url: string) {
  const response = await fetch(`${url}/__toolpad_dev__/manifest.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch app dev manifest: ${response.status}`);
  }
  return response.text();
}

function createProject(url: string, serializedManifest: string, queryClient: QueryClient) {
  const manifest = JSON.parse(serializedManifest);
  const events = new Emitter<ProjectEvents>();

  const ws = new WebSocket(manifest.wsUrl);

  ws.addEventListener('error', () => console.error(`Websocket failed to connect "${ws.url}"`));

  ws.addEventListener('open', () => {
    // eslint-disable-next-line no-console
    console.log('Socket connected');
  });

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    switch (message.kind) {
      case 'projectEvent': {
        events.emit(message.event, message.payload);
        break;
      }
      default:
        throw new Error(`Unknown message kind: ${message.kind}`);
    }
  });

  const api = createRpcApi<ServerDefinition>(queryClient, `${url}/__toolpad_dev__/rpc`);

  const unsubExternalChange = events.subscribe('externalChange', () => {
    api.invalidateQueries('loadDom', []);
  });

  const unsubFunctionsChanged = events.subscribe('functionsChanged', () => {
    api.invalidateQueries('introspect', []);
  });

  const dispose = () => {
    ws.close();
    unsubExternalChange();
    unsubFunctionsChanged();
  };

  return {
    url,
    rootDir: manifest.rootDir,
    api,
    events,
    dispose,
  };
}

type Project = Awaited<ReturnType<typeof createProject>>;

const ProjectContext = React.createContext<Project | undefined>(undefined);

export interface ProjectProps {
  url: string;
  children: React.ReactNode;
}

export function ProjectProvider({ url, children }: ProjectProps) {
  const { data: manifest } = useSuspenseQuery({
    queryKey: ['app-dev-manifest', url],
    queryFn: () => fetchAppDevManifest(url),
  });

  invariant(manifest, "manifest should be defined, we're using suspense");

  const queryClient = useQueryClient();

  const project = React.useMemo(
    () => createProject(url, manifest, queryClient),
    [url, manifest, queryClient],
  );

  React.useEffect(() => {
    return () => {
      project.dispose();
    };
  }, [project]);

  return <ProjectContext.Provider value={project}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  return useNonNullableContext(ProjectContext);
}
