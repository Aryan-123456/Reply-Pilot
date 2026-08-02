-- CreateEnum
CREATE TYPE "BrandVoiceKind" AS ENUM ('PROFESSIONAL', 'FRIENDLY', 'LUXURY', 'CASUAL', 'CUSTOM');
CREATE TYPE "ReplyStatus" AS ENUM ('DRAFT', 'POSTING', 'POSTED', 'FAILED');
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Organization" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Organization_pkey" PRIMARY KEY ("id"));
CREATE TABLE "OrganizationMember" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'OWNER', CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id"));
CREATE TABLE "GoogleAccount" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "googleAccountId" TEXT NOT NULL, "email" TEXT NOT NULL, "encryptedAccessToken" TEXT NOT NULL, "encryptedRefreshToken" TEXT NOT NULL, "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Location" ("id" TEXT NOT NULL, "googleAccountId" TEXT NOT NULL, "googleLocationId" TEXT NOT NULL, "name" TEXT NOT NULL, "address" TEXT, "autoReply" BOOLEAN NOT NULL DEFAULT false, "replyLength" INTEGER NOT NULL DEFAULT 90, "language" TEXT NOT NULL DEFAULT 'English', "aiModel" TEXT NOT NULL DEFAULT 'gpt-5.6-luna', CONSTRAINT "Location_pkey" PRIMARY KEY ("id"));
CREATE TABLE "BrandVoice" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT, "kind" "BrandVoiceKind" NOT NULL DEFAULT 'PROFESSIONAL', "customInstructions" TEXT, CONSTRAINT "BrandVoice_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Review" ("id" TEXT NOT NULL, "locationId" TEXT NOT NULL, "googleReviewId" TEXT NOT NULL, "reviewerName" TEXT NOT NULL, "rating" INTEGER NOT NULL, "comment" TEXT, "reviewedAt" TIMESTAMP(3) NOT NULL, "googleReplyUpdatedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Review_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ReviewReply" ("id" TEXT NOT NULL, "reviewId" TEXT NOT NULL, "content" TEXT NOT NULL, "status" "ReplyStatus" NOT NULL DEFAULT 'DRAFT', "generatedBy" TEXT NOT NULL DEFAULT 'AI', "postedAt" TIMESTAMP(3), "failureReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ReviewReply_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SyncLog" ("id" TEXT NOT NULL, "locationId" TEXT NOT NULL, "status" "SyncStatus" NOT NULL, "message" TEXT, "reviewsFound" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id"));

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");
CREATE UNIQUE INDEX "GoogleAccount_googleAccountId_key" ON "GoogleAccount"("googleAccountId");
CREATE UNIQUE INDEX "Location_googleLocationId_key" ON "Location"("googleLocationId");
CREATE UNIQUE INDEX "BrandVoice_locationId_key" ON "BrandVoice"("locationId");
CREATE UNIQUE INDEX "Review_googleReviewId_key" ON "Review"("googleReviewId");
CREATE INDEX "Review_locationId_reviewedAt_idx" ON "Review"("locationId", "reviewedAt");
CREATE INDEX "ReviewReply_reviewId_status_idx" ON "ReviewReply"("reviewId", "status");
CREATE INDEX "SyncLog_locationId_createdAt_idx" ON "SyncLog"("locationId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleAccount" ADD CONSTRAINT "GoogleAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "GoogleAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandVoice" ADD CONSTRAINT "BrandVoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandVoice" ADD CONSTRAINT "BrandVoice_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
