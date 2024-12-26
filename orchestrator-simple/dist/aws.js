import { S3Client, ListObjectsV2Command, GetObjectCommand, CopyObjectCommand, PutObjectCommand, } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
const s3 = new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
// Fetch a folder from S3 and save it locally
export const fetchS3Folder = async (key, localPath) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME ?? "",
        Prefix: key,
    };
    const response = await s3.send(new ListObjectsV2Command(params));
    if (response.Contents) {
        for (const file of response.Contents) {
            const fileKey = file.Key;
            if (fileKey) {
                const getObjectParams = {
                    Bucket: process.env.S3_BUCKET ?? "",
                    Key: fileKey,
                };
                const data = await s3.send(new GetObjectCommand(getObjectParams));
                if (data.Body) {
                    const fileData = await streamToBuffer(data.Body);
                    const filePath = `${localPath}/${fileKey.replace(key, "")}`;
                    await writeFile(filePath, fileData);
                }
            }
        }
    }
};
// Copy a folder within S3
export async function copyS3Folder(sourcePrefix, destinationPrefix, continuationToken) {
    try {
        const listParams = {
            Bucket: process.env.AWS_BUCKET_NAME ?? "",
            Prefix: sourcePrefix,
            ContinuationToken: continuationToken,
        };
        const listedObjects = await s3.send(new ListObjectsV2Command(listParams));
        if (!listedObjects.Contents || listedObjects.Contents.length === 0)
            return;
        for (const object of listedObjects.Contents) {
            if (!object.Key)
                continue;
            const destinationKey = object.Key.replace(sourcePrefix, destinationPrefix);
            const copyParams = {
                Bucket: process.env.S3_BUCKET ?? "",
                CopySource: `${process.env.S3_BUCKET}/${object.Key}`,
                Key: destinationKey,
            };
            console.log(copyParams);
            await s3.send(new CopyObjectCommand(copyParams));
            console.log(`Copied ${object.Key} to ${destinationKey}`);
        }
        if (listedObjects.IsTruncated && listedObjects.NextContinuationToken) {
            await copyS3Folder(sourcePrefix, destinationPrefix, listedObjects.NextContinuationToken);
        }
    }
    catch (error) {
        console.error("Error copying folder:", error);
    }
}
// Save a file to S3
export const saveToS3 = async (key, filePath, content) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME ?? "",
        Key: `${key}${filePath}`,
        Body: content,
    };
    await s3.send(new PutObjectCommand(params));
};
// Helper function to write file locally
function writeFile(filePath, fileData) {
    return new Promise(async (resolve, reject) => {
        await createFolder(path.dirname(filePath));
        fs.writeFile(filePath, fileData, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
// Helper function to create folders
function createFolder(dirName) {
    return new Promise((resolve, reject) => {
        fs.mkdir(dirName, { recursive: true }, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}
