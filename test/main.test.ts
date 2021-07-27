import '@aws-cdk/assert/jest';
import { App } from 'aws-cdk-lib';
import { InquisitorStack } from '../src/main';

test('Snapshot', () => {
  const app = new App();
  const stack = new InquisitorStack(app, 'test');

  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});