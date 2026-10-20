const assert = require('assert');
const prisma = require('../src/config/db');

const BASE_URL = 'http://localhost:4000/api/v1';

async function runEmailVerificationTests() {
  console.log('====================================================');
  console.log('   MATINEE EMAIL VERIFICATION & ONE-TIME LINK TEST  ');
  console.log('====================================================\n');

  const testEmail = `verify_test_${Date.now()}@example.com`;
  const password = 'SecurePassword123!';
  const name = 'Amara Ngozi Okoli';

  // 1. Register User and Verify Token Generation
  console.log('1. Registering new user:', testEmail);
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password, name })
  });

  const regData = await regRes.json();
  assert.strictEqual(regRes.status, 201, `Registration failed: ${JSON.stringify(regData)}`);
  assert.strictEqual(regData.user.emailVerified, false, 'User must initially have emailVerified: false');
  console.log('   User registered successfully. emailVerified =', regData.user.emailVerified);

  // Query Database to verify token storage
  const dbUser = await prisma.user.findUnique({
    where: { email: testEmail }
  });
  assert(dbUser.verificationToken, 'verificationToken must be present in database');
  assert(dbUser.verificationTokenExpiresAt, 'verificationTokenExpiresAt must be set');
  console.log('   Database verificationToken generated:', dbUser.verificationToken.substring(0, 16) + '...');
  console.log('   Token expires at:', dbUser.verificationTokenExpiresAt);

  // 2. Test Invalid Token
  console.log('\n2. Testing invalid verification token rejection:');
  const invalidRes = await fetch(`${BASE_URL}/auth/verify-email?token=invalid_token_12345&format=json`);
  const invalidData = await invalidRes.json();
  assert.strictEqual(invalidRes.status, 400, 'Invalid token must return 400');
  assert.strictEqual(invalidData.error.code, 'INVALID_VERIFICATION_TOKEN');
  console.log('   Correctly rejected invalid token with code:', invalidData.error.code);

  // 3. Test HTML Response (Browser-friendly)
  console.log('\n3. Testing browser verification (Accept: text/html):');
  const htmlRes = await fetch(`${BASE_URL}/auth/verify-email?token=${dbUser.verificationToken}`, {
    headers: { 'Accept': 'text/html' }
  });
  const htmlText = await htmlRes.text();
  assert.strictEqual(htmlRes.status, 200, 'Verification URL should return 200 OK');
  assert(htmlText.includes('Email Verified Successfully!'), 'HTML should contain success confirmation');
  assert(htmlText.includes('MATINEE'), 'HTML should include Matinee branding');
  console.log('   Verification HTML page returned with 200 OK and Matinee branding.');

  // 4. Check Database State After Verification
  const verifiedUser = await prisma.user.findUnique({
    where: { email: testEmail }
  });
  assert.strictEqual(verifiedUser.emailVerified, true, 'User emailVerified must now be true');
  assert(verifiedUser.emailVerifiedAt, 'emailVerifiedAt must be populated');
  assert.strictEqual(verifiedUser.verificationToken, null, 'verificationToken must be cleared to null');
  assert.strictEqual(verifiedUser.verificationTokenExpiresAt, null, 'verificationTokenExpiresAt must be cleared');
  console.log('   User verified in DB! emailVerified = true, emailVerifiedAt =', verifiedUser.emailVerifiedAt);
  console.log('   Token cleared from database: verificationToken = null');

  // 5. Test ONE-TIME LINK GUARANTEE (Replay attack prevention)
  console.log('\n4. Testing ONE-TIME LINK guarantee (re-using the same link):');
  const reuseRes = await fetch(`${BASE_URL}/auth/verify-email?token=${dbUser.verificationToken}&format=json`);
  const reuseData = await reuseRes.json();
  assert.strictEqual(reuseRes.status, 400, 'Used token must be rejected with 400');
  assert.strictEqual(reuseData.error.code, 'INVALID_VERIFICATION_TOKEN');
  console.log('   Second verification attempt with same link was rejected! Code:', reuseData.error.code);
  console.log('   One-time verification link is strictly single-use!');

  // 6. Test Resend Verification for already verified user
  console.log('\n5. Testing resend verification for already-verified user:');
  const resendVerifiedRes = await fetch(`${BASE_URL}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  const resendVerifiedData = await resendVerifiedRes.json();
  assert.strictEqual(resendVerifiedData.alreadyVerified, true);
  console.log('   Resend correctly recognized user is already verified:', resendVerifiedData.message);

  // 7. Test Resend Verification for unverified user
  const unverifiedEmail = `unverified_${Date.now()}@example.com`;
  console.log('\n6. Testing resend verification flow for unverified user:', unverifiedEmail);
  await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: unverifiedEmail, password, name: 'Chukwudi Eze' })
  });

  const resendRes = await fetch(`${BASE_URL}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: unverifiedEmail })
  });
  const resendData = await resendRes.json();
  assert.strictEqual(resendRes.status, 200);
  assert.strictEqual(resendData.success, true);
  console.log('   Resend endpoint sent new link successfully:', resendData.message);

  const updatedUnverified = await prisma.user.findUnique({
    where: { email: unverifiedEmail }
  });
  assert(updatedUnverified.verificationToken, 'Fresh token must be assigned');
  console.log('   Fresh one-time token assigned:', updatedUnverified.verificationToken.substring(0, 16) + '...');

  // 8. Test Expired Token Behavior
  console.log('\n7. Testing expired token rejection:');
  await prisma.user.update({
    where: { id: updatedUnverified.id },
    data: {
      verificationTokenExpiresAt: new Date(Date.now() - 3600000) // Expired 1 hour ago
    }
  });

  const expiredRes = await fetch(`${BASE_URL}/auth/verify-email?token=${updatedUnverified.verificationToken}&format=json`);
  const expiredData = await expiredRes.json();
  assert.strictEqual(expiredRes.status, 400);
  assert.strictEqual(expiredData.error.code, 'VERIFICATION_TOKEN_EXPIRED');
  console.log('   Expired token correctly rejected with code:', expiredData.error.code);

  console.log('\n====================================================');
  console.log('   ALL EMAIL VERIFICATION TESTS PASSED (100%)       ');
  console.log('====================================================\n');
}

runEmailVerificationTests()
  .catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
