import * as cdk from "aws-cdk-lib";
import { CfnOutput, SecretValue } from "aws-cdk-lib";
import { Construct } from "constructs";

import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { App, GitHubSourceCodeProvider, RedirectStatus } from "@aws-cdk/aws-amplify-alpha";
import { CfnApp } from "aws-cdk-lib/aws-amplify";

export class DocusaurusInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //create aws secret
    const secret = new cdk.aws_secretsmanager.Secret(this, "DocusaurusSecret", {
      secretName: "gh_repo_token",
      secretStringValue: SecretValue.unsafePlainText(process.env.GH_PERSONAL_TOKEN!),
    });

    //create amplify app using github provider
    const amplifyApp = new App(this, "DocusaurusApp", {
      sourceCodeProvider: new GitHubSourceCodeProvider({
        owner: "just4give",
        repository: "cdk-amplify-docusaurus",
        oauthToken: cdk.SecretValue.secretsManager(secret.secretName),
      }),

      customRules: [
        {
          source: "/<*>",
          target: "	/index.html",
          status: RedirectStatus.NOT_FOUND_REWRITE,
        },
      ],
      //write amplify build spec
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: 1,
        frontend: {
          phases: {
            preBuild: {
              commands: ["npm ci"],
            },
            build: {
              commands: ["npm run build"],
            },
          },
          artifacts: {
            baseDirectory: "build",
            files: ["**/*"],
          },
          cache: {
            paths: ["node_modules/**/*"],
          },
        },
      }),
    });

    amplifyApp.addBranch("main", {
      stage: "PRODUCTION",
    });

    //Drop down to L1 to allow new NextJS architecture
    const cfnAmplifyApp = amplifyApp.node.defaultChild as CfnApp;
    cfnAmplifyApp.platform = "WEB_COMPUTE";

    new CfnOutput(this, "appId", {
      value: amplifyApp.appId,
    });
  }
}
