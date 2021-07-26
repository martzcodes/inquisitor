import { db } from './documentClient';

export const saveAsyncApi = async (
  table: string,
  asyncApi: any,
): Promise<Error | null> => {
  try {
    const res = await db
      .put({
        TableName: table,
        Item: {
          PK: 'AsyncApi',
          SK: 'VERSION#LATEST',
          ...asyncApi,
        },
        ReturnValues: 'ALL_OLD',
      })
      .promise();
    console.log(JSON.stringify(res));

    // TODO: once latest is saved, archive old version
  } catch (e) {
    console.error(e);
    return e;
  }
  return null;
};
