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
        title: 'Inquisitor',
        version: '0.0.1',
        description: `Inquisitor is a CDK-based app that uses EventBridge Schema Registry with Event Discovery to build a self-documenting Event API.
        Any events that are forwarded to the inquisitor event bus, ${process.env.INQUISITOR_BUS}, will get identified and documented.
        From there a npm library will be created for the TypeScript interfaces of the discovered schemas.
        Over time the system will infer optional properties and possibly make recommendations for how to improve your event schema.`,
      },
      channels: {},
      components: {
        messages: {},
        schemas: {},
      },
    }),
  };
};