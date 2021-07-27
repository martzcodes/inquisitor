import { App, CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/lib/aws-dynamodb';
import { EventBus, Rule } from 'aws-cdk-lib/lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/lib/aws-events-targets';
import { CfnDiscoverer } from 'aws-cdk-lib/lib/aws-eventschemas';
import { Effect, PolicyStatement } from 'aws-cdk-lib/lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/lib/aws-lambda-nodejs';
import { Bucket, BucketAccessControl, HttpMethods } from 'aws-cdk-lib/lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class InquisitorStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const bus = new EventBus(this, 'inquisitorBus', {
      eventBusName: 'inquisitorBus',
    });

    new CfnDiscoverer(this, 'inquisitorDisco', {
      sourceArn: bus.eventBusArn,
      description: 'Inquisitor Discoverer',
    });

    const tableName = 'inquisitorTable';
    const table = new Table(this, tableName, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: tableName,
    });

    const inquisitorApiBucket = new Bucket(this, 'inquisitorApiBucket', {
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      bucketName: `${this.stackName}-${this.account}-inquisitorApiBucket`.toLowerCase(),
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag', 'x-amz-meta-custom-header', 'Authorization', 'Content-Type', 'Accept'],
        },
      ],
    });

    const lambdaProps = {
      handler: 'handler',
      runtime: Runtime.NODEJS_14_X,
    };

    const targetFunction = new NodejsFunction(this, 'targetFunction', {
      functionName: `${this.stackName}targetFunction`,
      ...lambdaProps,
      entry: `${__dirname}/target.ts`,
      memorySize: 1024,
      timeout: Duration.seconds(60),
      environment: {
        API_BUCKET: inquisitorApiBucket.bucketName,
        INQUISITOR_BUS: bus.eventBusArn,
      },
    });

    const schemaPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'schemas:*',
      ],
      resources: [
        `arn:aws:schemas:${this.region}:${this.account}:registry/*`,
        `arn:aws:schemas:${this.region}:${this.account}:schema/*`,
      ],
    });

    targetFunction.addToRolePolicy(schemaPolicy);
    table.grantReadWriteData(targetFunction);
    inquisitorApiBucket.grantReadWrite(targetFunction);

    const rule = new Rule(this, 'schemaRule', {
      description: 'This is a rule for schema events...',
      eventPattern: {
        source: ['aws.schemas'],
      },
    });

    rule.addTarget(new LambdaFunction(targetFunction));

    const siteBucket = new Bucket(this, 'SiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag', 'x-amz-meta-custom-header', 'Authorization', 'Content-Type', 'Accept'],
        },
      ],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy site contents to S3 bucket
    new BucketDeployment(this, 'BucketDeployment', {
      sources: [Source.asset('./frontend/build')],
      destinationBucket: siteBucket,
    });

    new CfnOutput(this, 'bucketWebsiteUrl', {
      value: siteBucket.bucketWebsiteUrl,
    });
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new InquisitorStack(app, 'inquisitorStack', { env: devEnv });

app.synth();