/**
 * Basic Usage Example for Google Drive SDK
 * 
 * This example demonstrates the core functionality of the Google Drive SDK
 * including authentication, file operations, and folder management.
 */

import { GoogleDriveSDK } from '../src';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Initialize the SDK
  const drive = new GoogleDriveSDK({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback'
  });

  console.log('Google Drive SDK initialized');

  // Example 1: Get authorization URL
  // In a real application, redirect the user to this URL
  const authUrl = drive.getAuthUrl();
  console.log('\n1. Authorization URL:');
  console.log(authUrl);
  console.log('\nIn a real app, redirect the user to this URL to authorize.');
  console.log('After authorization, you will receive an authorization code.');

  // Example 2: Exchange code for tokens (skip if you already have credentials)
  // const code = 'authorization_code_from_redirect';
  // const credentials = await drive.exchangeCode(code);
  // await drive.authenticate(credentials);

  // For this example, assume we have stored credentials
  // In production, load these from secure storage
  if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
    await drive.authenticate({
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      expiry_date: parseInt(process.env.GOOGLE_TOKEN_EXPIRY || '0')
    });

    console.log('\n2. Authenticated with stored credentials');

    // Example 3: List files
    console.log('\n3. Listing files:');
    const filesResult = await drive.listFiles({ pageSize: 5 });
    console.log(`Found ${filesResult.files.length} files:`);
    filesResult.files.forEach(file => {
      console.log(`  - ${file.name} (${file.mimeType})`);
    });

    // Example 4: Create a folder
    console.log('\n4. Creating a folder:');
    const folder = await drive.createFolder('SDK Test Folder ' + Date.now());
    console.log(`Created folder: ${folder.name} (ID: ${folder.id})`);

    // Example 5: Upload a file
    console.log('\n5. Uploading a file:');
    const uploadedFile = await drive.uploadFile({
      name: 'test-document.txt',
      content: 'Hello from Google Drive SDK!\n\nThis is a test file created by the SDK.',
      mimeType: 'text/plain',
      parentId: folder.id
    });
    console.log(`Uploaded file: ${uploadedFile.name} (ID: ${uploadedFile.id})`);
    console.log(`View at: ${uploadedFile.webViewLink}`);

    // Example 6: Search for files
    console.log('\n6. Searching for text files:');
    const textFiles = await drive.searchFiles('mimeType="text/plain"', 3);
    console.log(`Found ${textFiles.length} text files:`);
    textFiles.forEach(file => {
      console.log(`  - ${file.name}`);
    });

    // Example 7: Share a file
    console.log('\n7. Sharing a file:');
    // Uncomment to actually share (requires a valid email)
    // await drive.shareFile(uploadedFile.id, {
    //   type: 'user',
    //   role: 'reader',
    //   emailAddress: 'user@example.com'
    // });
    // console.log('File shared with user@example.com');
    console.log('(Skipped - uncomment code to test sharing)');

    // Example 8: Get file metadata
    console.log('\n8. Getting file metadata:');
    const fileMetadata = await drive.getFile(uploadedFile.id);
    console.log('File metadata:');
    console.log(`  Name: ${fileMetadata.name}`);
    console.log(`  Type: ${fileMetadata.mimeType}`);
    console.log(`  Size: ${fileMetadata.size} bytes`);
    console.log(`  Created: ${fileMetadata.createdTime}`);

    // Example 9: Copy a file
    console.log('\n9. Copying a file:');
    const copiedFile = await drive.copyFile(uploadedFile.id, 'Copy of ' + uploadedFile.name);
    console.log(`Copied file: ${copiedFile.name} (ID: ${copiedFile.id})`);

    // Example 10: Rename a file
    console.log('\n10. Renaming a file:');
    const renamedFile = await drive.renameFile(copiedFile.id, 'renamed-document.txt');
    console.log(`Renamed file to: ${renamedFile.name}`);

    // Example 11: List permissions
    console.log('\n11. Listing file permissions:');
    const permissions = await drive.listPermissions(uploadedFile.id);
    console.log(`File has ${permissions.length} permission(s):`);
    permissions.forEach(perm => {
      console.log(`  - ${perm.role} (${perm.type}): ${perm.emailAddress || perm.domain || 'N/A'}`);
    });

    // Clean up (optional - comment out to keep test files)
    console.log('\n12. Cleaning up test files:');
    await drive.deleteFile(renamedFile.id);
    console.log('Deleted copied file');
    await drive.deleteFile(uploadedFile.id);
    console.log('Deleted uploaded file');
    await drive.deleteFile(folder.id);
    console.log('Deleted test folder');

    console.log('\n✅ All examples completed successfully!');
  } else {
    console.log('\nTo run authenticated examples, set these environment variables:');
    console.log('  GOOGLE_CLIENT_ID');
    console.log('  GOOGLE_CLIENT_SECRET');
    console.log('  GOOGLE_ACCESS_TOKEN');
    console.log('  GOOGLE_REFRESH_TOKEN');
    console.log('  GOOGLE_TOKEN_EXPIRY');
  }
}

// Run the example
main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
