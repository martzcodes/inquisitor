import { App, Stack, StackProps } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/lib/aws-events-targets';
import { CfnDiscoverer } from 'aws-cdk-lib/lib/aws-eventschemas';
import { Runtime } from 'aws-cdk-lib/lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const bus = new EventBus(this, 'inquisitorBus', {
      eventBusName: 'inquisitorBus',
    });

    new CfnDiscoverer(this, 'inquisitorDisco', {
      sourceArn: bus.eventBusArn,
      description: 'Inquisitor Discoverer',
    });

    const lambdaProps = {
      handler: 'handler',
      runtime: Runtime.NODEJS_14_X,
    };

    const targetFunction = new NodejsFunction(this, 'targetFunction', {
      functionName: `${this.stackName}targetFunction`,
      ...lambdaProps,
      entry: `${__dirname}/target.ts`,
    });

    const rule = new Rule(this, 'schemaRule', {
      description: 'This is a rule for schema events...',
      eventPattern: {
        source: ['aws.schemas'],
      },
    });

    rule.addTarget(new LambdaFunction(targetFunction));
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'inquisitorStack', { env: devEnv });

app.synth();