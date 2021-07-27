import { EventBridgeEvent } from 'aws-lambda';
import { S3, Schemas } from 'aws-sdk';
import { Document } from 'yaml';
import { getAsyncApi } from './repos/getAsyncApi';
import { saveAsyncApi } from './repos/saveAsyncApi';
import { saveExportedSchema } from './repos/saveExportedSchema';

const tableName = 'inquisitorTable';

const updateSeen = (version: string, date: string, description?: string) => {
  let updatedDescription: Record<string, string> = {
    firstSeen: date,
    firstVersion: version,
  };
  if (description && description.length) {
    try {
      const jsonDescription = JSON.parse(description);
      updatedDescription = { ...updatedDescription, ...jsonDescription };
    } catch (e) {
      console.log('description was not json');
    }
  }
  updatedDescription.lastSeen = date;
  updatedDescription.lastVersion = version;
  return JSON.stringify(updatedDescription);
};

export const handler = async (
  event: EventBridgeEvent<string, any>,
): Promise<void> => {
  console.log(JSON.stringify(event));
  const RegistryName = event.detail?.RegistryName || 'discovered-schemas';
  const SchemaName = event.detail?.SchemaName || 'mystore@ReviewCreated';
  const Version = event.detail?.Version || '0';
  const schemaDate = event.detail?.CreationDate || new Date().toDateString();

  try {
    const schemas = new Schemas();

    const jsonSchema = await schemas
      .exportSchema({
        RegistryName,
        SchemaName,
        Type: 'JSONSchemaDraft4',
      })
      .promise();
    console.log(JSON.stringify(jsonSchema));
    const content = (jsonSchema.Content || '').replace(
      /\#\/definitions\//gi,
      '#/components/schemas/',
    );
    const jsonContent = JSON.parse(content);
    console.log(jsonContent);

    await saveExportedSchema(tableName, SchemaName, Version, jsonSchema);

    const asyncApi = await getAsyncApi({ tableName });

    const existingChannel = asyncApi.channels[`${jsonContent.title}`] || {};
    const updatedTags = new Set((existingChannel.publish?.tags || []).map((tag: {name: string}) => tag.name));
    updatedTags.add(`${jsonContent['x-amazon-events-source']}`);
    asyncApi.channels[
      `${jsonContent.title}`
    ] = {
      description: `${jsonContent['x-amazon-events-detail-type']}`,
      publish: {
        tags: [...updatedTags].map((tag) => ({ name: tag })),
        message: { $ref: `#/components/messages/${jsonContent.title}` },
      },
    };

    const existingMessage =
      asyncApi.components.messages[`${jsonContent.title}`] || {};
    const eventSources = new Set(
      JSON.parse(existingMessage.description || '{}').sources || [],
    );
    eventSources.add(jsonContent['x-amazon-events-source']);

    const message = {
      ...existingMessage,
      name: jsonContent.title,
      description: `Emitted by: ${JSON.stringify({
        sources: [...eventSources],
      })}`,
      title: `${[...eventSources].join(',')}: ${jsonContent.title}`,
      payload: {
        $ref: `#/components/schemas/${jsonContent.title}`,
      },
    };
    console.log(message);

    asyncApi.components.messages[message.name] = message;
    // merge schemas
    Object.keys(jsonContent.definitions).forEach((defName) => {
      const existingSchema = asyncApi.components.schemas[`${defName}`] || {};
      const def = {
        ...existingSchema,
        ...jsonContent.definitions[defName],
        id: defName,
        description: updateSeen(
          Version,
          schemaDate,
          existingSchema.description,
        ),
        properties: {
          ...existingSchema.properties,
          ...jsonContent.definitions[defName].properties,
        },
      };
      Object.keys(jsonContent.definitions[defName].properties).forEach(
        (propName) => {
          def.properties[propName].description = updateSeen(
            Version,
            schemaDate,
            def.properties[propName].description,
          );
        },
      );
      asyncApi.components.schemas[`${defName}`] = def;
    });

    // update verison
    const versionSplit = asyncApi.info.version.split('.');
    versionSplit[2] = `${Number(versionSplit[2]) + 1}`;

    // increment the patch number automatically... a future API endpoint will do the major/minor versions when things are manually changed about a schema (removing old params, etc)
    asyncApi.info.version = versionSplit.join('.');
    delete asyncApi.PK;
    delete asyncApi.SK;

    console.log(JSON.stringify(asyncApi));

    await saveAsyncApi(tableName, asyncApi);

    const asyncAPIYml = new Document();
    asyncAPIYml.contents = asyncApi;
    console.log(asyncAPIYml.toString());

    // TODO: Write YML to S3
    const s3 = new S3();
    const putObjectBody = {
      Bucket: `${process.env.API_BUCKET}`,
      Key: 'latest.yml',
      Body: asyncAPIYml.toString(),
    };
    console.log(JSON.stringify(putObjectBody));
    await s3.putObject(putObjectBody).promise();

    // prep codebuild for npm packaging and generating the documentation page

    // TODO: Prep for npm packaging?
    // // this needs to get pulled into codebuild
    // await generate({
    //   input: JSON.stringify({ openapi: '3.0.3', ...asyncApi }),
    //   output: './temp',
    //   exportCore: false,
    //   exportModels: true,
    //   exportSchemas: false,
    //   exportServices: false,
    // });
  } catch (e) {
    console.log(e);
  }

  return;
};
