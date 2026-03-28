-- Step 1: Add new fields to Book model
ALTER TABLE "Book" ADD COLUMN "language" TEXT;
ALTER TABLE "Book" ADD COLUMN "coverImage" BYTEA;
ALTER TABLE "Book" ADD COLUMN "totalChapters" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Book" ADD COLUMN "totalParagraphs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Book" ADD COLUMN "currentChapterId" TEXT;
ALTER TABLE "Book" ADD COLUMN "currentParagraphOrder" INTEGER;
ALTER TABLE "Book" ADD COLUMN "readPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Step 2: Add summary to Chapter
ALTER TABLE "Chapter" ADD COLUMN "summary" TEXT;

-- Step 3: Create CharacterAlias table
CREATE TABLE "CharacterAlias" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CharacterAlias_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create CharacterAlias indexes
CREATE INDEX "CharacterAlias_characterId_idx" ON "CharacterAlias"("characterId");
CREATE UNIQUE INDEX "CharacterAlias_characterId_alias_key" ON "CharacterAlias"("characterId", "alias");

-- Step 5: Populate CharacterAlias from existing Character data
INSERT INTO "CharacterAlias" ("id", "characterId", "alias", "isPrimary", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "Character"."id",
    "Character"."nick",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Character";

INSERT INTO "CharacterAlias" ("id", "characterId", "alias", "isPrimary", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "Character"."id",
    "Character"."orig",
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Character"
WHERE "Character"."nick" != "Character"."orig";

-- Step 6: Add characterAliasId to CharacterMention (nullable first)
ALTER TABLE "CharacterMention" ADD COLUMN "characterAliasId" TEXT;

-- Step 7: Populate characterAliasId from existing characterId
UPDATE "CharacterMention" cm
SET "characterAliasId" = ca.id
FROM "CharacterAlias" ca
WHERE ca."characterId" = cm."characterId" AND ca."isPrimary" = true;

-- Step 8: Make characterAliasId NOT NULL and add FK
ALTER TABLE "CharacterMention" ALTER COLUMN "characterAliasId" SET NOT NULL;
CREATE INDEX "CharacterMention_characterAliasId_idx" ON "CharacterMention"("characterAliasId");

-- Step 9: Drop old characterId FK and column
ALTER TABLE "CharacterMention" DROP CONSTRAINT "CharacterMention_characterId_fkey";
DROP INDEX IF EXISTS "CharacterMention_characterId_idx";
ALTER TABLE "CharacterMention" DROP COLUMN "characterId";

-- Step 10: Add CharacterAlias FK
ALTER TABLE "CharacterAlias" ADD CONSTRAINT "CharacterAlias_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 11: Add CharacterMention FK to CharacterAlias
ALTER TABLE "CharacterMention" ADD CONSTRAINT "CharacterMention_characterAliasId_fkey" FOREIGN KEY ("characterAliasId") REFERENCES "CharacterAlias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 12: Drop old Character.mentions index (mentions field removed from Character model)
-- (index was on characterId which is now removed)

-- Step 13: Create ParagraphTranslation table
CREATE TABLE "ParagraphTranslation" (
    "id" TEXT NOT NULL,
    "paragraphId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ParagraphTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParagraphTranslation_paragraphId_key" ON "ParagraphTranslation"("paragraphId");
ALTER TABLE "ParagraphTranslation" ADD CONSTRAINT "ParagraphTranslation_paragraphId_fkey" FOREIGN KEY ("paragraphId") REFERENCES "Paragraph"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 14: Create VocabularyWord table
CREATE TABLE "VocabularyWord" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "phonetic" TEXT,
    "contextSentence" TEXT,
    "chapterTitle" TEXT,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitionCount" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VocabularyWord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VocabularyWord_bookId_word_key" ON "VocabularyWord"("bookId", "word");
CREATE INDEX "VocabularyWord_bookId_idx" ON "VocabularyWord"("bookId");
ALTER TABLE "VocabularyWord" ADD CONSTRAINT "VocabularyWord_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 15: Create ReviewLog table
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewLog_wordId_idx" ON "ReviewLog"("wordId");
CREATE INDEX "ReviewLog_wordId_reviewedAt_idx" ON "ReviewLog"("wordId", "reviewedAt");
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 16: Create Highlight table
CREATE TABLE "Highlight" (
    "id" TEXT NOT NULL,
    "paragraphId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'yellow',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Highlight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Highlight_paragraphId_idx" ON "Highlight"("paragraphId");
CREATE INDEX "Highlight_bookId_idx" ON "Highlight"("bookId");
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_paragraphId_fkey" FOREIGN KEY ("paragraphId") REFERENCES "Paragraph"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 17: Create ReadingSession table
CREATE TABLE "ReadingSession" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "chaptersRead" INTEGER NOT NULL DEFAULT 0,
    "paragraphsRead" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ReadingSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadingSession_bookId_idx" ON "ReadingSession"("bookId");
CREATE INDEX "ReadingSession_bookId_startedAt_idx" ON "ReadingSession"("bookId", "startedAt");
ALTER TABLE "ReadingSession" ADD CONSTRAINT "ReadingSession_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
