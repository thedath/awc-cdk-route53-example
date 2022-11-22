import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import { CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";

import * as path from "path";
import { EndpointType, SecurityPolicy } from "aws-cdk-lib/aws-apigateway";

export interface AwsCdkRoute53ExampleStackProps extends cdk.StackProps {
  domainName: string;
  subDomainPrefixes: string[];
  apiGatewaySubdomain: string;
}

export class AwsCdkRoute53ExampleStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: AwsCdkRoute53ExampleStackProps
  ) {
    super(scope, id, props);

    const zone = new route53.HostedZone(this, props.domainName, {
      zoneName: props.domainName,
    });

    const certificate = new certificatemanager.Certificate(
      this,
      props.domainName + "-certificateTester",
      {
        certificateName: props.domainName + "-certificate",
        domainName: props.domainName,
        subjectAlternativeNames: props.subDomainPrefixes,
        validation: CertificateValidation.fromDns(zone),
      }
    );

    new cdk.CfnOutput(this, "ZoneName", {
      exportName: "zoneName",
      value: zone.zoneName,
    });

    new cdk.CfnOutput(this, "HostedZoneId", {
      exportName: "hostedZoneId",
      value: zone.hostedZoneId,
    });

    new cdk.CfnOutput(this, "HostedZoneArn", {
      exportName: "hostedZoneArn",
      value: zone.hostedZoneArn,
    });

    const api = new apigateway.RestApi(this, `RestApiDomainTester`, {
      restApiName: "restApiDomainTester",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: { stageName: "dev" },
      domainName: {
        certificate,
        domainName: props.apiGatewaySubdomain,
        endpointType: EndpointType.REGIONAL,
        securityPolicy: SecurityPolicy.TLS_1_2,
      },
    });

    const testDomainLambda = new lambda.Function(this, `LambdaDomainTester`, {
      functionName: "LambdaDomainTester",
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

    new route53.ARecord(this, "AliasRecord", {
      zone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
    });
  }
}
