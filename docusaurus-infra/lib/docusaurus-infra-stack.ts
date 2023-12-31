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
      autoBranchCreation: {
        // Automatically connect branches that match a pattern set
        patterns: ["feature/*"],
      },
      autoBranchDeletion: true,
      environmentVariables: {
        _CUSTOM_IMAGE: "amplify:al2023",
        // _LIVE_UPDATES: JSON.stringify([
        //   {
        //     pkg: "node",
        //     type: "nvm",
        //     version: "18.17.1",
        //   },
        // ]),
      },

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

    const mainBranch = amplifyApp.addBranch("main", {
      stage: "PRODUCTION",
    });

    const domain = amplifyApp.addDomain("iammithun.link", {
      enableAutoSubdomain: true, // in case subdomains should be auto registered for branches
      autoSubdomainCreationPatterns: ["feature/*"], // regex for branches that should auto register subdomains
    });

    // //domain.mapRoot(mainBranch);
    domain.mapSubDomain(mainBranch, "docs");

    //Set the platform to WEB_COMPUTE for NextJS SSR
    // const cfnAmplifyApp = amplifyApp.node.defaultChild as CfnApp;
    // cfnAmplifyApp.platform = "WEB_COMPUTE";

    new CfnOutput(this, "appId", {
      value: amplifyApp.appId,
    });
  }
}
