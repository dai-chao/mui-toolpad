import * as React from 'react';
import { Typography } from '@mui/material';
import { createComponent } from '@mui/toolpad/browser';

export interface MyComponentProps {
  msg: string;
}

function MyComponent({ msg }: MyComponentProps) {
  return <Typography>{msg}</Typography>;
}

export default createComponent(MyComponent, {
  argTypes: {
    msg: {
      type: 'string',
      default: 'Hello world!',
    },
  },
});
