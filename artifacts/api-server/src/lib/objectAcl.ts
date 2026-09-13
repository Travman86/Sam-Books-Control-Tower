import { File } from "@google-cloud/storage";

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
}

export async function setObjectAclPolicy(
  objectFile: File,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  const [exists] = await objectFile.exists();
  if (!exists) throw new Error(`Object not found: ${objectFile.name}`);
  await objectFile.setMetadata({
    metadata: { "custom:aclPolicy": JSON.stringify(aclPolicy) },
  });
}

export async function getObjectAclPolicy(
  objectFile: File,
): Promise<ObjectAclPolicy | null> {
  const [metadata] = await objectFile.getMetadata();
  const value = metadata.metadata?.["custom:aclPolicy"];
  return value ? JSON.parse(String(value)) : null;
}
