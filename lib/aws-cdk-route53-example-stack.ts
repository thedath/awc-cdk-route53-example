import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import * as path from "path";

export class AwsCdkRoute53ExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new apigateway.RestApi(this, `restApiDomainTester`, {
      restApiName: "restApiDomainTester",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const testDomainLambda = new lambda.Function(this, `lambdaDomainTester`, {
      functionName: "lambdaDomainTester",
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "./lambda"), {
        exclude: ["*.ts", "*.d.ts"],
      }),
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(
      testDomainLambda
    );

    const hello = api.root.addResource("hello");
    hello.addMethod("GET", lambdaIntegration);

    const zone = new route53.HostedZone(this, "hostedZoneTester", {
      zoneName: "testapi.otterz.com",
    });
  }
}
