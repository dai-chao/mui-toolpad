/**
 * Toolpad data provider file.
 * See: https://mui.com/toolpad/concepts/data-providers/
 */

import { createDataProvider } from '@mui/toolpad/server';

export default createDataProvider({
  async getRecords({ paginationModel: { start, pageSize } }) {
    return {
      records: [],
    };
  },
});
