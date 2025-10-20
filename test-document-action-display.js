// test-document-action-display.js
// Manual test to verify document action display in Fast Agent Panel

// Inline implementation of extraction functions for testing
function extractDocumentActions(text) {
  const documents = [];
  const regex = /<!-- DOCUMENT_ACTION_DATA\n([\s\S]*?)\n-->/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data.documentId && data.title) {
        documents.push(data);
      }
    } catch (error) {
      console.error('[extractDocumentActions] Failed to parse document action data:', error);
    }
  }

  return documents;
}

function removeDocumentActionMarkers(text) {
  return text.replace(/<!-- DOCUMENT_ACTION_DATA\n[\s\S]*?\n-->\n*/g, '');
}

console.log('================================================================================');
console.log('🧪 DOCUMENT ACTION DISPLAY TEST');
console.log('================================================================================\n');

// Test 1: Extract document creation action
console.log('Test 1: Extract Document Creation Action');
console.log('─────────────────────────────────────────');

const createResponse = `Document created successfully!

Title: "Investment Thesis - Anthropic"
ID: k57abc123def456
Public: Yes

The document is ready to edit.

<!-- DOCUMENT_ACTION_DATA
{"action":"created","documentId":"k57abc123def456","title":"Investment Thesis - Anthropic","isPublic":true}
-->`;

const createdDocs = extractDocumentActions(createResponse);
console.log('Extracted documents:', JSON.stringify(createdDocs, null, 2));
console.log('Expected: 1 document with action="created"');
console.log('✅ PASS:', createdDocs.length === 1 && createdDocs[0].action === 'created' ? 'YES' : 'NO');
console.log();

// Test 2: Extract document update action
console.log('Test 2: Extract Document Update Action');
console.log('─────────────────────────────────────────');

const updateResponse = `Document updated successfully!
Updated fields: title, content

The document has been saved with your changes.

<!-- DOCUMENT_ACTION_DATA
{"action":"updated","documentId":"k57abc123def456","title":"Investment Thesis - Anthropic (Updated)","updatedFields":["title","content"]}
-->`;

const updatedDocs = extractDocumentActions(updateResponse);
console.log('Extracted documents:', JSON.stringify(updatedDocs, null, 2));
console.log('Expected: 1 document with action="updated"');
console.log('✅ PASS:', updatedDocs.length === 1 && updatedDocs[0].action === 'updated' ? 'YES' : 'NO');
console.log();

// Test 3: Extract multiple document actions
console.log('Test 3: Extract Multiple Document Actions');
console.log('─────────────────────────────────────────');

const multiResponse = `I've created two documents for you:

Document created successfully!

Title: "Research Notes"
ID: k57abc111
Public: No

The document is ready to edit.

<!-- DOCUMENT_ACTION_DATA
{"action":"created","documentId":"k57abc111","title":"Research Notes","isPublic":false}
-->

Document created successfully!

Title: "Meeting Minutes"
ID: k57abc222
Public: Yes

The document is ready to edit.

<!-- DOCUMENT_ACTION_DATA
{"action":"created","documentId":"k57abc222","title":"Meeting Minutes","isPublic":true}
-->`;

const multiDocs = extractDocumentActions(multiResponse);
console.log('Extracted documents:', JSON.stringify(multiDocs, null, 2));
console.log('Expected: 2 documents');
console.log('✅ PASS:', multiDocs.length === 2 ? 'YES' : 'NO');
console.log();

// Test 4: Remove document action markers
console.log('Test 4: Remove Document Action Markers');
console.log('─────────────────────────────────────────');

const cleanedCreate = removeDocumentActionMarkers(createResponse);
console.log('Original length:', createResponse.length);
console.log('Cleaned length:', cleanedCreate.length);
console.log('Contains marker:', cleanedCreate.includes('DOCUMENT_ACTION_DATA') ? 'YES (FAIL)' : 'NO (PASS)');
console.log('✅ PASS:', !cleanedCreate.includes('DOCUMENT_ACTION_DATA') ? 'YES' : 'NO');
console.log();

// Test 5: Handle malformed data
console.log('Test 5: Handle Malformed Data');
console.log('─────────────────────────────────────────');

const malformedResponse = `Document created successfully!

<!-- DOCUMENT_ACTION_DATA
{invalid json here}
-->`;

const malformedDocs = extractDocumentActions(malformedResponse);
console.log('Extracted documents:', JSON.stringify(malformedDocs, null, 2));
console.log('Expected: 0 documents (should handle gracefully)');
console.log('✅ PASS:', malformedDocs.length === 0 ? 'YES' : 'NO');
console.log();

// Summary
console.log('================================================================================');
console.log('📊 TEST SUMMARY');
console.log('================================================================================');
console.log('All tests completed. Check results above.');
console.log('Expected: All tests should show ✅ PASS: YES');
console.log('================================================================================');

