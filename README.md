# Inquisitor

This project is going to evaluate [EventBridge Atlas](https://github.com/boyney123/eventbridge-atlas) which looks like a neat EventBridge documentation tool that makes use of the [Schema Registry with Event Discovery](https://aws.amazon.com/blogs/compute/introducing-amazon-eventbridge-schema-registry-and-discovery-in-preview/).

This is part 1 of 2 (probably).

This specific repo will generate a bunch of events in different formats to see how well the documentation ends up and what setup is like for that project.  I might also add some layers of automation to it as well.  Maybe a lambda that subscribes to the bus and checks the schema registry for changes and stores stuff in DynamoDB?

Part 2 would hypothetically involve improved observability, auto-generation of installable libraries with the schemas (TS interfaces / emitters / etc) and possibly some PRs and forks of EB Atlas.  Really it depends on how Part 1 goes :wink:.

This will also ultimately be a blog post which may or may not be the same as this README.  I'll document my notes here in the README at least.

## Getting Started (for me, not you)

Arch-wise I need a few things.  I :heart: CDK so I created a new projen project using `npx projen new awscdk-app-ts --cdk-version 2.0.0-rc.14` ... specifically with cdk 2 so I don't have to worry about installing a million CDK dependencies (definitely ready for 2.0 to be released).

Next I'll need an event-bus with discovery turned on... and really thats it.  Since I want to get a _little_ fancy I'll create an API Gateway backed by a lambda that passes through events.  And then the automation I mentioned before.

I might end up wanting a library like faker to help generate random event meta but... this should be a good start.

So far it's as simple as:

```typescript
    const bus = new EventBus(this, 'inquisitorBus', {
      eventBusName: 'inquisitorBus',
    });
    new CfnDiscoverer(this, 'inquisitorDisco', {
      sourceArn: bus.eventBusArn,
      description: 'Inquisitor Discoverer',
    });
```

Which creates the bus and then turns on Schema Discovery.  From there we need to send some events to see if they're discovered...

```bash
aws events put-events --entries '[{"Source": "mystore","DetailType": "Review Created","EventBusName":"inquisitorBus","Detail": "{\"star_rating\": 5,  \"description\": \"The size and length fit me well and the design is fun. I felt very secure wearing this tshirt. \",  \"helpful_count\": 34,  \"unhelpful_count\": 1,  \"pros\": [\"lightweight\",\"fits well\"  ],  \"cons\": [],  \"customer\": {\"name\": \"Julian Wood\",\"email\": \"julianreview@amazon.com\",\"phone\": \"+1 604 123 1234\"  },  \"product\": {\"product_id\": 788032119674292922,\"title\": \"Encrypt Everything Tshirt\",\"sku\": \"encrypt-everything-tshirt\",\"inventory_id\": 23190823132,\"size\": \"medium\",\"taxable\": true,\"image_url\": \"https://img.mystore.test/encrypt-tshirt.jpg\",\"weight\": 200.0}}"}]'
```

After sending the first event I checked the Discovered Schema Registry in AWS Console to find.... nothing.  But it does say "It could take several minutes for schemas to appear once discovery has been enabled."

It took about 5 minutes for the schema to be discovered...

Let's send some variations...

```bash
aws events put-events --entries '[{"Source": "mystore","DetailType": "Review Updated","EventBusName":"inquisitorBus","Detail": "{\"star_rating\": 5,  \"description\": \"The size and length fit me well and the design is fun. I felt very secure wearing this tshirt. \",  \"helpful_count\": 34,  \"unhelpful_count\": 1,  \"pros\": [\"lightweight\",\"fits well\"  ],  \"cons\": [],  \"customer\": {\"name\": \"Julian Wood\",\"email\": \"julianreview@amazon.com\",\"phone\": \"+1 604 123 1234\"  },  \"product\": {\"product_id\": 788032119674292922,\"title\": \"Encrypt Everything Tshirt\",\"sku\": \"encrypt-everything-tshirt\",\"inventory_id\": 23190823132,\"size\": \"medium\",\"taxable\": true}}"}]'
```

```bash
aws events put-events --entries '[{"Source": "myOtherStore","DetailType": "Review Created","EventBusName":"inquisitorBus","Detail": "{\"star_rating\": 5,  \"description\": \"The size and length fit me well and the design is fun. I felt very secure wearing this tshirt. \",  \"helpful_count\": 34,  \"unhelpful_count\": 1,  \"pros\": [\"lightweight\",\"fits well\"  ],  \"cons\": [],  \"customer\": {\"name\": \"Julian Wood\",\"email\": \"julianreview@amazon.com\",\"phone\": \"+1 604 123 1234\"  },  \"product\": {\"product_id\": 788032119674292922,\"title\": \"Encrypt Everything Tshirt\",\"sku\": \"encrypt-everything-tshirt\",\"inventory_id\": 23190823132,\"size\": \"medium\",\"taxable\": true,\"image_url\": \"https://img.mystore.test/encrypt-tshirt.jpg\",\"weight\": 200.0}}"}]'
```

```bash
aws events put-events --entries '[{"Source": "mystore","DetailType": "Review Created","EventBusName":"inquisitorBus","Detail": "{\"star_rating\": 5,  \"helpful_count\": 34,  \"unhelpful_count\": 1,  \"pros\": [\"lightweight\",\"fits well\"  ],  \"cons\": [],  \"customer\": {\"name\": \"Julian Wood\",\"email\": \"julianreview@amazon.com\",\"phone\": \"+1 604 123 1234\"  },  \"product\": {\"product_id\": 788032119674292922,\"title\": \"Encrypt Everything Tshirt\",\"sku\": \"encrypt-everything-tshirt\",\"inventory_id\": 23190823132,\"size\": \"medium\",\"taxable\": true,\"image_url\": \"https://img.mystore.test/encrypt-tshirt.jpg\"}}"}]'
```

```bash
aws events put-events --entries '[{"Source": "mystore","DetailType": "Review Created","EventBusName":"inquisitorBus","Detail": "{\"helpful_count\": 34,  \"unhelpful_count\": 1, \"customer\": {\"name\": \"Julian Wood\",\"email\": \"julianreview@amazon.com\",\"phone\": \"+1 604 123 1234\"  },  \"product\": {\"product_id\": 788032119674292922,\"sku\": \"encrypt-everything-tshirt\",\"inventory_id\": 23190823132,\"taxable\": true,\"image_url\": \"https://img.mystore.test/encrypt-tshirt.jpg\"}}"}]'
```


```bash
aws events put-events --entries '[{"Source": "mystore","DetailType": "Review Created","EventBusName":"inquisitorBus","Detail": "{\"helpful_count\": 34}"}]'
```

There seems to be a fairly consistent several minute lag between events and discovery.  I also wanted to see if it was smart enough to infer optional properties between events (it's not).  It does store the multiple versions of the schemas though... so you could re-combine them.  I suppose the best practice in this case would be to have a consistent event structure and if you need optional parameters, have different event detail types?

## Is there a schema registry change event?

AWS has two provided events `aws.schemas@SchemaCreated` and `aws.schemas@SchemaVersionCreated` but I can't tell if it's only for AWS Schemas or if it applies to any.  In this context the source of the event is `aws.schemas` and the detail-type is `SchemaVersionCreated`... so if I subscribe to just the source I should get the SchemaCreated and SchemaVersionCreated events.  These events go to the default event bus.

The event payload looks like this:

```json
{
    "version": "0",
    "id": "f480b317-a12f-5ccc-89ac-2446862c329b",
    "detail-type": "Schema Version Created",
    "source": "aws.schemas",
    "account": "359317520455",
    "time": "2021-07-24T15:01:29Z",
    "region": "us-east-1",
    "resources": [
        "arn:aws:schemas:us-east-1:359317520455:schema/discovered-schemas/mystore@ReviewCreated"
    ],
    "detail": {
        "SchemaName": "mystore@ReviewCreated",
        "SchemaType": "OpenApi3",
        "RegistryName": "discovered-schemas",
        "CreationDate": "2021-07-24T15:01:19Z",
        "Version": "5"
    }
}
```

This will be useful in part 2 :smiling_imp:

At this point I think we're ready to kick the tires on EventBridge Atlas.

## EventBridge Atlas

EventBridge Atlas isn't an npm library.  Setup for it wants you to clone the repo, install and then locally run / configure everything.  Part 2 will deal with improving that, but for now let's play by their rules.

[Getting Started](https://eventbridge-atlas.netlify.app/docs/getting-started/installation)

It's a pretty simple project that downloads the schema and then processes it through some parsers to support 4 different documentation engines.

1. Slate - pretty bare bones...
2. asyncapi - I like how this one split out the messages separate from the schemas
3. docuowl - similar to slate
4. flow (node diagram) - nice for visualization and would be great combined with x-ray or something, but for dev purposes I don't think it's _that_ useful

asyncapi looks to be the most useful.  So what does the EventBridge Atlas project actually do?

First it has you run `npm run generate-metadata-templates` command, **but this step is optional**.  This uses the aws sdk to list all the schemas, retrieves them all as JSON, and extends them a bit.  Nothing too special here... could be done as part of a lambda execution and saving to s3 and/or dynamodb (or both).

Next you have your choice of documentation engines... I liked asyncapi the best so what happens when you build using it?  It ultimately runs `npm run generate`... which does similar stuff to generating the metadata templates (also retrieves the schemas and extends them) and runs everything through a parse to get it in the preferred asyncapi format.  The project requires docker, but it looks like it's only for the slate and docuowl engines... which I don't want to use anyways.

Turns out, the metadata template step is optional and you can skip it.  It's only used to extend what goes through the parse in case you want to add notes or descriptions to the schemas.

## Next Steps

This concludes part 1.  I played with Schema Discovery and kicked the tires on EventBridge Atlas and learned a lot in the process.  But I can make this better.

Part 2 will involve:

* Having a lambda subcribe to and automatically update the documentation
* Store the automated documentation in DynamoDB (for merging / extending)
* Hosting a documentation site that is updated in pseudo-real-time
* Publishing a npm library with the TypeScript interfaces for these events

Something along those lines...