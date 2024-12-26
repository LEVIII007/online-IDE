import { S3Client, ListObjectsV2Command, CopyObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const s3 = new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
    endpoint: process.env.S3_ENDPOINT, // Optional, only if you're using a custom S3-compatible service
});

export async function copyS3Folder(sourcePrefix: string, destinationPrefix: string, continuationToken?: string): Promise<void> {
    try {
        const listParams = {
            Bucket: process.env.S3_BUCKET ?? "",
            Prefix: sourcePrefix,
            ContinuationToken: continuationToken,
        };

        const listedObjects = await s3.send(new ListObjectsV2Command(listParams));

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

        await Promise.all(
            listedObjects.Contents.map(async (object) => {
                if (!object.Key) return;

                const destinationKey = object.Key.replace(sourcePrefix, destinationPrefix);
                const copyParams = {
                    Bucket: process.env.AWS_BUCKET_NAME ?? "",
                    CopySource: `${process.env.AWS_BUCKET_NAME}/${object.Key}`,
                    Key: destinationKey,
                };

                console.log(copyParams);

                try {
                    await s3.send(new CopyObjectCommand(copyParams));
                    console.log(`Copied ${object.Key} to ${destinationKey}`);
                } catch (error) {
                    console.error(`Failed to copy ${object.Key}:`, error);
                }
            })
        );

        // Check if the list was truncated and continue copying if necessary
        if (listedObjects.IsTruncated) {
            await copyS3Folder(sourcePrefix, destinationPrefix, listedObjects.NextContinuationToken);
        }
    } catch (error) {
        console.error("Error copying folder:", error);
    }
}

export const saveToS3 = async (key: string, filePath: string, content: string): Promise<void> => {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET ?? "",
            Key: `${key}${filePath}`,
            Body: content,
        };

        await s3.send(new PutObjectCommand(params));
        console.log(`Saved content to S3: ${key}${filePath}`);
    } catch (error) {
        console.error("Error saving to S3:", error);
    }
};
