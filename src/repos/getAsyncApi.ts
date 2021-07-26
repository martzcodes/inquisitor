import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { db } from './documentClient';


export const getAsyncApi = async ({
  tableName,
}: {
  tableName: string;
}) => {
  const params: DocumentClient.GetItemInput = {
    TableName: tableName,
    Key: {
      PK: 'AsyncApi',
      SK: 'VERSION#LATEST',
    },
  };

  const result = await db.get(params).promise();

  return {
    ...(result.Item || {
      asyncapi: '2.1.0',
      info: {
        title: 'Discovered EventBridge Events',
        version: '0.0.1',
      },
      channels: {},
      components: {
        messages: {},
        schemas: {},
      },
    }),
  };
};