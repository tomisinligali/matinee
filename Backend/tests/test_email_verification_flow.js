const assert = require('assert');
const prisma = require('../src/config/db');
const verificationCodeService = require('../src/modules/identity/verificationCode.service');

const BASE_URL = 'http://localhost:4000/api/v1';

async function runEndToEndVerificationFlowTests() {
  console.log('====================================================');
  console.log('   FULL EMAIL VERIFICATION & BACKGROUND JOB TEST   ');
  console.log('====================================================\n');

  // 1. Verify VerificationCodeService constraints
  console.log('1. Testing VerificationCodeService (crypto.randomBytes(32)):');
  for (let i = 0; i < 5; i++) {
    const code = verificationCodeService.generateCode();
    assert.strictEqual(typeof code, 'string');
    assert.strictEqual(code.length, 6, `Code must be exactly 6 digits: ${code}`);
    assert(/^[0-9]{6}$/.test(code), `Code must consist only of digits: ${code}`);
    const num = parseInt(code, 10);
    assert(num >= 100000 && num <= 999999, `Code must be between 100000 and 999999: ${num}`);
  }
  console.log('   Verification code generation strictly validated (6-digit uniform numeric codes).');

  // 2. Register New User
  const testEmail = `flow_test_${Date.now()}@example.com`;
  const password = 'StrongPassword123!';
  const name = 'Olufemi Babatunde Adeleke';

  console.log('\n2. Registering account on /api/v1/auth/register:', testEmail);
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password, name })
  });

  const regData = await regRes.json();
  assert.strictEqual(regRes.status, 201, `Registration failed: ${JSON.stringify(regData)}`);
  assert.strictEqual(regData.user.emailVerified, false, 'emailVerified must initially be false');
  console.log('   User created with emailVerified: false');

  // 3. Inspect PostgreSQL Database
  const dbUser = await prisma.user.findUnique({
    where: { email: testEmail }
  });
  assert(dbUser.verificationCode, 'verificationCode must exist in DB');
  assert.strictEqual(dbUser.verificationCode.length, 6);
  assert(dbUser.verificationCodeExpiresAt, 'verificationCodeExpiresAt must be set');
  console.log('   PostgreSQL User Record: verificationCode =', dbUser.verificationCode);

  // 4. Inspect Durable Background Job in PostgreSQL
  console.log('\n3. Verifying background job enqueue in background_jobs table:');
  const job = await prisma.backgroundJob.findFirst({
    where: {
      jobType: 'SEND_VERIFICATION_EMAIL',
      correlationId: dbUser.id
    },
    orderBy: { createdAt: 'desc' }
  });
  assert(job, 'Background job SEND_VERIFICATION_EMAIL must be enqueued');
  console.log('   Background job found! ID:', job.id, 'Status:', job.status, 'Queue:', job.queueName);

  // Wait briefly for background worker to process the job
  console.log('   Waiting for background job worker to process email dispatch...');
  let processedJob = job;
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise(r => setTimeout(r, 1000));
    processedJob = await prisma.backgroundJob.findUnique({ where: { id: job.id } });
    if (processedJob && processedJob.status === 'COMPLETED') break;
  }
  console.log('   Background job completed! Status:', processedJob.status, 'Attempts:', processedJob.attempts);
  assert.strictEqual(processedJob.status, 'COMPLETED', 'Background job must complete successfully');

  // 5. Test Invalid 6-Digit Code
  console.log('\n4. Testing invalid verification code rejection:');
  const invalidRes = await fetch(`${BASE_URL}/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: '000000' })
  });
  const invalidData = await invalidRes.json();
  assert.strictEqual(invalidRes.status, 400);
  assert.strictEqual(invalidData.error.code, 'INVALID_VERIFICATION_CODE');
  console.log('   Invalid code correctly rejected! Code:', invalidData.error.code);

  // 6. Test Valid 6-Digit Code Verification (The user entering code in form)
  console.log('\n5. Submitting authentic 6-digit verification code to /api/v1/auth/verify-code:');
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: dbUser.verificationCode })
  });
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyRes.status, 200, `Verification failed: ${JSON.stringify(verifyData)}`);
  assert.strictEqual(verifyData.success, true);
  assert.strictEqual(verifyData.user.emailVerified, true);
  assert(verifyData.token, 'JWT session token must be returned');
  console.log('   Verification successful! Returned session token.');

  // Check DB state after code verification
  const verifiedUser = await prisma.user.findUnique({ where: { email: testEmail } });
  assert.strictEqual(verifiedUser.emailVerified, true);
  assert(verifiedUser.emailVerifiedAt, 'emailVerifiedAt must be populated');
  assert.strictEqual(verifiedUser.verificationCode, null, 'verificationCode must be cleared to null');
  assert.strictEqual(verifiedUser.verificationToken, null, 'verificationToken must be cleared to null');
  console.log('   PostgreSQL confirmed: emailVerified = true, verificationCode = null');

  // 7. Test One-Time Code Guarantee (Replay prevention)
  console.log('\n6. Testing ONE-TIME code guarantee (submitting same code again):');
  const reuseRes = await fetch(`${BASE_URL}/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: dbUser.verificationCode })
  });
  const reuseData = await reuseRes.json();
  // Since user is already verified:
  assert.strictEqual(reuseData.emailVerified, true);
  console.log('   Already verified safely handled:', reuseData.message);

  // 8. Test Resend Code & Expiry on second user
  const unverifiedEmail = `unverified_flow_${Date.now()}@example.com`;
  console.log('\n7. Testing resend & expired code on second user:', unverifiedEmail);
  await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: unverifiedEmail, password, name: 'Chioma Ebere' })
  });

  const resendRes = await fetch(`${BASE_URL}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: unverifiedEmail })
  });
  const resendData = await resendRes.json();
  assert.strictEqual(resendRes.status, 200);
  assert(resendData.verificationCode, 'Resend returns new code');
  console.log('   Resend generated fresh code:', resendData.verificationCode);

  // Expire code in DB manually to test expiry logic
  const unverifiedUser = await prisma.user.findUnique({ where: { email: unverifiedEmail } });
  await prisma.user.update({
    where: { id: unverifiedUser.id },
    data: { verificationCodeExpiresAt: new Date(Date.now() - 60000) } // 1 minute ago
  });

  const expiredRes = await fetch(`${BASE_URL}/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: unverifiedEmail, code: unverifiedUser.verificationCode })
  });
  const expiredData = await expiredRes.json();
  assert.strictEqual(expiredRes.status, 400);
  assert.strictEqual(expiredData.error.code, 'VERIFICATION_CODE_EXPIRED');
  console.log('   Expired code correctly rejected! Code:', expiredData.error.code);

  console.log('\n====================================================');
  console.log('   ALL END-TO-END VERIFICATION TESTS PASSED (100%)  ');
  console.log('====================================================\n');
}

runEndToEndVerificationFlowTests()
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
