import { Schemas } from 'aws-sdk';
import { db } from './documentClient';

export const saveExportedSchema = async (
  table: string,
  SchemaName: string,
  Version: string,
  schema: Schemas.ExportSchemaResponse,
): Promise<Error | null> => {
  try {
    await db
      .put({
        TableName: table,
        Item: {
          PK: 'RAW',
          SK: `NAME#${SchemaName}#VERSION#${Version}`,
          ...schema,
        },
      })
      .promise();
  } catch (e) {
    console.error(e);
    return e;
  }
  return null;
};
