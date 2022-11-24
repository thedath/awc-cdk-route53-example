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
import { RemovalPolicy } from "aws-cdk-lib";

export interface AwsCdkRoute53ExampleStackProps extends cdk.StackProps {}

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

    const zone = new route53.HostedZone(this, `testing-hosted-zone`, {
      zoneName: "apiv1.otterz.co",
    });
    zone.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const certificate = new certificatemanager.Certificate(
      this,
      `testing-certificate`,
      {
        certificateName: `testing-certificate`,
        domainName: "apiv1.otterz.co",
        subjectAlternativeNames: ["sub.apiv1.otterz.co"],
        validation: CertificateValidation.fromDns(zone),
      }
    );
    certificate.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const subDomainName = new apigateway.DomainName(
      this,
      "testing-sub-domain-name",
      {
        certificate,
        domainName: "sub.apiv1.otterz.co",
        endpointType: EndpointType.EDGE,
        securityPolicy: SecurityPolicy.TLS_1_2,
      }
    );
    subDomainName.applyRemovalPolicy(RemovalPolicy.DESTROY);

    new route53.ARecord(this, `${TAG2}-a-record`, {
      zone,
      recordName: "sub.apiv1.otterz.co",
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayDomain(subDomainName)
      ),
      deleteExisting: true,
    });

    new cdk.CfnOutput(this, `testing-zone-name`, {
      exportName: "zoneName",
      value: zone.zoneName,
    });

    new cdk.CfnOutput(this, `testing-hosted-zone-id`, {
      exportName: "hostedZoneId",
      value: zone.hostedZoneId,
    });

    new cdk.CfnOutput(this, `testing-hosted-zone-arn`, {
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
      deployOptions: { stageName: "lake" },
      // domainName: {
      //   certificate,
      //   domainName: "alligator.apiv1.otterz.co",
      //   endpointType: EndpointType.EDGE,
      //   securityPolicy: SecurityPolicy.TLS_1_2,
      // },
    });

    const integration1 = new apigateway.LambdaIntegration(lambda1);

    const biteResource = api1.root.addResource("bite");
    biteResource.addMethod("GET", integration1);

    new apigateway.BasePathMapping(this, `${TAG1}-base-path-mapping`, {
      domainName: subDomainName,
      restApi: api1,
      basePath: "alligator",
    });

    ///////////////////// API 2 DEFINITION /////////////////////

    const lambda2 = new lambda.Function(this, `${TAG2}-lambda-function`, {
      functionName: `${TAG2}-lambda-function`,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "./lambda"), {
        exclude: ["*.ts", "*.d.ts"],
      }),
    });

    const api2 = new apigateway.RestApi(this, `${TAG2}-rest-api`, {
      restApiName: `${TAG2}-rest-api`,
      endpointTypes: [EndpointType.EDGE],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: { stageName: "river" },
      // domainName: {
      //   certificate,
      //   domainName: "crocodile.apiv1.otterz.co",
      //   endpointType: EndpointType.EDGE,
      //   securityPolicy: SecurityPolicy.TLS_1_2,
      //   basePath: "crocodile",
      // },
    });

    const integration2 = new apigateway.LambdaIntegration(lambda2);

    const diveResource = api2.root.addResource("dive");
    diveResource.addMethod("GET", integration2);

    new apigateway.BasePathMapping(this, `${TAG2}-base-path-mapping`, {
      domainName: subDomainName,
      restApi: api2,
      basePath: "crocodile",
    });
  }
}
