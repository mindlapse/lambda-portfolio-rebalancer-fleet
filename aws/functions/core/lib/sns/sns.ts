import { MessageAttributeValue, PublishBatchCommand, PublishBatchRequestEntry, PublishCommand, SNSClient } from "@aws-sdk/client-sns"

const snsClient = new SNSClient({ region: process.env.REGION });

export const publishOne = async <M>(
    topicArn:string, 
    message: M, 
    messageAttributes?: Record<string, MessageAttributeValue>
    ): Promise<boolean> => {

    let success = true;
    try {
        const msg = JSON.stringify({...message,  _timestamp: new Date().toISOString()});
        const publishCommand = new PublishCommand({
            Message: msg,
            MessageAttributes: messageAttributes,
            MessageGroupId: 'common',
            MessageStructure: undefined,
            Subject: undefined,
            TopicArn: topicArn
            
        })
        const result = await snsClient.send(publishCommand)

    } catch (e) {
        console.error(e);
        success = false;
    }
    return success;
}

export const publishBatch = async <M>(messages: M[], topicArn:string) => {

    let success = true;
    try {
        const msgAttributes = { "type": { "DataType": "String", "StringValue": "item"} };

        const entries = messages.map((msg: M, idx): PublishBatchRequestEntry => ({
            Id: idx.toString(),
            Message: JSON.stringify({...msg, _timestamp: new Date().toISOString()}),
            MessageAttributes: msgAttributes,
            // MessageDeduplicationId: undefined,
            MessageGroupId: 'common',
            MessageStructure: undefined,

            Subject: undefined
        }))

        const chunkSize = 10;

        for (let i = 0, len = entries.length; i < len; i += chunkSize) {
            let chunk = entries.slice(i, i+chunkSize);

            const publishCommand = new PublishBatchCommand({
                PublishBatchRequestEntries: chunk,
                TopicArn: topicArn,
            })
            console.log(`Sending chunk to ${topicArn}`, chunk)
            const result = await snsClient.send(publishCommand)

            if (result.Failed && result.Failed.length > 0) {
                console.log("Failure detected", result.Failed);
                success = false;
                break;
            }
        }
    } catch (e) {
        console.log(e);
        success = false;
    }
    console.log("Publish complete: ", success);
    return success;
}