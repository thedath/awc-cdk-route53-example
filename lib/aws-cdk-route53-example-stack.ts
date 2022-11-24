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

const TAG1 = "alligator";
const TAG2 = "crocodile";

export class AwsCdkRoute53ExampleStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: AwsCdkRoute53ExampleStackProps
  ) {
    super(scope, id, props);

    ///////////////////// DOMAIN & SUB DOMAIN SETUP /////////////////////

    const zone = new route53.HostedZone(this, `${TAG1}-hosted-zone`, {
      zoneName: props.domainName,
    });

    const certificate = new certificatemanager.Certificate(
      this,
      `${TAG1}-certificate`,
      {
        certificateName: `${TAG1}-certificate`,
        domainName: props.domainName,
        subjectAlternativeNames: props.subDomainPrefixes,
        validation: CertificateValidation.fromDns(zone),
      }
    );

    const apiDomainName = new apigateway.DomainName(
      this,
      `${TAG1}-domain-name`,
      {
        certificate,
        domainName: props.apiGatewaySubdomain,
        endpointType: EndpointType.EDGE,
        securityPolicy: SecurityPolicy.TLS_1_2,
      }
    );

    new cdk.CfnOutput(this, `${TAG1}-zone-name`, {
      exportName: "zoneName",
      value: zone.zoneName,
    });

    new cdk.CfnOutput(this, `${TAG1}-hosted-zone-id`, {
      exportName: "hostedZoneId",
      value: zone.hostedZoneId,
    });

    new cdk.CfnOutput(this, `${TAG1}-hosted-zone-arn`, {
      exportName: "hostedZoneArn",
      value: zone.hostedZoneArn,
    });

    ///////////////////// API 1 DEFINITION /////////////////////

    const lambda1 = new lambda.Function(this, `${TAG1}-lambda-function1`, {
      functionName: `${TAG1}-lambda-function1`,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "./lambda"), {
        exclude: ["*.ts", "*.d.ts"],
      }),
    });

    const api1 = new apigateway.RestApi(this, `${TAG1}-rest-api1`, {
      restApiName: `${TAG1}-rest-api1`,
      endpointTypes: [EndpointType.EDGE],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      // deployOptions: { stageName: "lake" },
      // domainName: {
      //   certificate,
      //   domainName: props.apiGatewaySubdomain,
      //   endpointType: EndpointType.EDGE,
      //   securityPolicy: SecurityPolicy.TLS_1_2,
      //   basePath: "alligator",
      // },
    });

    const integration1 = new apigateway.LambdaIntegration(lambda1);

    const biteResource = api1.root.addResource("bite");
    biteResource.addMethod("GET", integration1);

    const stage1 = new apigateway.Stage(this, "", {
      stageName: "lake",
      description: "Alligator in a lake, get readying to bite",
      deployment: new apigateway.Deployment(this, "", { api: api1 }),
    });

    apiDomainName.addBasePathMapping(api1, {
      stage: stage1,
      basePath: "alligator",
    });

    new route53.ARecord(this, `${TAG1}-a-record`, {
      zone,
      recordName: props.apiGatewaySubdomain,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api1)),
      deleteExisting: true,
    });

    const lambda2 = new lambda.Function(this, `${TAG2}-lambda-function`, {
      functionName: `${TAG2}-lambda-function`,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "./lambda"), {
        exclude: ["*.ts", "*.d.ts"],
      }),
    });

    ///////////////////// API 2 DEFINITION /////////////////////

    const api2 = new apigateway.RestApi(this, `${TAG2}-rest-api`, {
      restApiName: `${TAG2}-rest-api`,
      endpointTypes: [EndpointType.EDGE],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },

      // deployOptions: { stageName: "river" },
      // domainName: {
      //   certificate,
      //   domainName: props.apiGatewaySubdomain,
      //   endpointType: EndpointType.EDGE,
      //   securityPolicy: SecurityPolicy.TLS_1_2,
      //   basePath: "crocodile",
      // },
    });

    const integration2 = new apigateway.LambdaIntegration(lambda2);

    const diveResource = api2.root.addResource("dive");
    diveResource.addMethod("GET", integration2);

    const stage2 = new apigateway.Stage(this, "", {
      stageName: "river",
      description: "Crocodile in a river, get readying to dive",
      deployment: new apigateway.Deployment(this, "", { api: api2 }),
    });

    apiDomainName.addBasePathMapping(api2, {
      stage: stage2,
      basePath: "crocodile",
    });

    new route53.ARecord(this, `${TAG2}-a-record`, {
      zone,
      recordName: props.apiGatewaySubdomain,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api2)),
      deleteExisting: true,
    });
  }
}
