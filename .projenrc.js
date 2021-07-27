const { AwsCdkTypeScriptApp, web } = require('projen');
const project = new AwsCdkTypeScriptApp({
  cdkVersion: '2.0.0-rc.14',
  defaultReleaseBranch: 'main',
  name: 'inquisitor',
  deps: ['aws-lambda', 'aws-sdk', 'yaml', 'openapi-typescript-codegen'],
  devDeps: ['esbuild', '@types/aws-lambda'],
  jest: false,

  // cdkDependencies: undefined,        /* Which AWS CDK modules (those that start with "@aws-cdk/") this app uses. */
  // deps: [],                          /* Runtime dependencies of this module. */
  // description: undefined,            /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                       /* Build dependencies for this module. */
  // packageName: undefined,            /* The "name" in package.json. */
  // projectType: ProjectType.UNKNOWN,  /* Which type of project this is (library/app). */
  // release: undefined,                /* Add release management to this project. */
});
project.setScript('build', 'cd frontend && npm run build && cd .. && npx projen build');
project.synth();

const frontendProject = new web.ReactTypeScriptProject({
  defaultReleaseBranch: 'main',
  outdir: 'frontend',
  parent: project,
  name: 'cdk-s3-website',
  deps: ['@asyncapi/react-component@v1.0.0-next.14', 'axios'],
  jest: false,
});

frontendProject.setScript('test', 'npx projen test -- --passWithNoTests');

frontendProject.synth();
