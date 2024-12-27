import { S3Client, ListObjectsV2Command, GetObjectCommand, CopyObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const S3client = new S3Client({
    region: 'us-east-1',
    endpoint: 'https://s3.amazonaws.com',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// Function to fetch a folder from S3 and save locally
export const fetchS3Folder = async (key: string, localPath: string): Promise<void> => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME ?? "",
        Prefix: key,
    };

    const response = await S3client.send(new ListObjectsV2Command(params));
    if (response.Contents) {
        for (const file of response.Contents) {
            const fileKey = file.Key;
            if (fileKey) {
                const getObjectParams = {
                    Bucket: process.env.AWS_BUCKET_NAME ?? "",
                    Key: fileKey,
                };

                const data = await S3client.send(new GetObjectCommand(getObjectParams));
                if (data.Body) {
                    const fileData = await streamToBuffer(data.Body as ReadableStream);
                    const filePath = `${localPath}/${fileKey.replace(key, "")}`;
                    await writeFile(filePath, fileData);
                }
            }
        }
    }
};

// Function to copy an S3 folder to another S3 location
export async function copyS3Folder(
    sourcePrefix: string,
    destinationPrefix: string,
    continuationToken?: string
): Promise<void> {
    try {
        const listParams = {
            Bucket: process.env.AWS_BUCKET_NAME ?? "",
            Prefix: sourcePrefix,
            ContinuationToken: continuationToken,
        };

        const listedObjects = await S3client.send(new ListObjectsV2Command(listParams));
        if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

        for (const object of listedObjects.Contents) {
            if (!object.Key) continue;
            const destinationKey = object.Key.replace(sourcePrefix, destinationPrefix);
            const copyParams = {
                Bucket: process.env.AWS_BUCKET_NAME ?? "",
                CopySource: `${process.env.AWS_BUCKET_NAME}/${object.Key}`,
                Key: destinationKey,
            };

            console.log(copyParams);
            await S3client.send(new CopyObjectCommand(copyParams));
            console.log(`Copied ${object.Key} to ${destinationKey}`);
        }

        if (listedObjects.IsTruncated && listedObjects.NextContinuationToken) {
            await copyS3Folder(sourcePrefix, destinationPrefix, listedObjects.NextContinuationToken);
        }
    } catch (error) {
        console.error('Error copying folder:', error);
    }
}

// Function to save a file to S3
export const saveToS3 = async (key: string, filePath: string, content: string): Promise<void> => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME ?? "",
        Key: `${key}${filePath}`,
        Body: content,
    };

    await S3client.send(new PutObjectCommand(params));
};

// Helper function to convert stream to buffer
async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as any) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

// Helper function to write files locally
function writeFile(filePath: string, fileData: Buffer): Promise<void> {
    return new Promise(async (resolve, reject) => {
        await createFolder(path.dirname(filePath));
        fs.writeFile(filePath, fileData, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Helper function to create folders recursively
function createFolder(dirName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.mkdir(dirName, { recursive: true }, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
