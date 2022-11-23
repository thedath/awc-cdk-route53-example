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

const TAG = "alligator";

export class AwsCdkRoute53ExampleStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: AwsCdkRoute53ExampleStackProps
  ) {
    super(scope, id, props);

    const zone = new route53.HostedZone(this, `${TAG}-hosted-zone`, {
      zoneName: props.domainName,
    });

    const certificate = new certificatemanager.Certificate(
      this,
      `${TAG}-certificate`,
      {
        certificateName: `${TAG}-certificate`,
        domainName: props.domainName,
        subjectAlternativeNames: props.subDomainPrefixes,
        validation: CertificateValidation.fromDns(zone),
      }
    );

    new cdk.CfnOutput(this, `${TAG}-zone-name`, {
      exportName: "zoneName",
      value: zone.zoneName,
    });

    new cdk.CfnOutput(this, `${TAG}-hosted-zone-id`, {
      exportName: "hostedZoneId",
      value: zone.hostedZoneId,
    });

    new cdk.CfnOutput(this, `${TAG}-hosted-zone-arn`, {
      exportName: "hostedZoneArn",
      value: zone.hostedZoneArn,
    });

    const api = new apigateway.RestApi(this, `${TAG}-rest-api`, {
      restApiName: `${TAG}-rest-api`,
      endpointTypes: [EndpointType.EDGE],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: { stageName: "lake" },
      domainName: {
        certificate,
        domainName: props.apiGatewaySubdomain,
        endpointType: EndpointType.EDGE,
        securityPolicy: SecurityPolicy.TLS_1_2,
      },
    });

    const testDomainLambda = new lambda.Function(
      this,
      `${TAG}-lambda-function`,
      {
        functionName: `${TAG}-lambda-function`,
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "./lambda"), {
          exclude: ["*.ts", "*.d.ts"],
        }),
      }
    );

    const lambdaIntegration = new apigateway.LambdaIntegration(
      testDomainLambda
    );

    const hello = api.root.addResource("bite");
    hello.addMethod("GET", lambdaIntegration);

    new route53.ARecord(this, `${TAG}-a-record`, {
      zone,
      recordName: props.apiGatewaySubdomain,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
      deleteExisting: true,
    });
  }
}
