#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DocusaurusInfraStack } from "../lib/docusaurus-infra-stack";
import * as dotenv from "dotenv";

dotenv.config();

const app = new cdk.App();
new DocusaurusInfraStack(app, "DocusaurusInfraStack", {
  description: "Docusaurus infra stack",
  env: {
    account: process.env.ACCOUNT,
    region: process.env.REGION,
  },
});
