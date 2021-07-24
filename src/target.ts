import { EventBridgeEvent } from 'aws-lambda';

export const handler = async (
  event: EventBridgeEvent<string, any>,
): Promise<void> => {

  console.log(JSON.stringify(event));
  return;
};
