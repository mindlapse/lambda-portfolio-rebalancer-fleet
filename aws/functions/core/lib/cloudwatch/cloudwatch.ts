import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const PRICE = "price";
const NAMESPACE = "ethmatic";
const cloudwatch = new CloudWatchClient({ region: process.env.REGION });

export const safePushPriceMetric = async (pair: string, ma: number, pct: number, value: number) => {
    console.log(`metric ${pair} am ${ma} pct ${pct}: value ${value}`)
    try {
        const result = await cloudwatch.send(new PutMetricDataCommand({
            MetricData: [{
                MetricName: PRICE,
                StorageResolution: 1,
                Timestamp: new Date(),
                Value: value,
                Dimensions: [
                    {
                        Name: "pair",
                        Value: pair
                    },
                    {
                        Name: "ma",
                        Value: ma.toString()
                    },
                    {
                        Name: "pct",
                        Value: pct.toFixed(3),
                    }
                ]
            }],
            Namespace: NAMESPACE
        }))

        console.log("result: ", result);
    
    } catch (e) {
        console.log("Error pushing to cloudwatch", e)
    }
}
