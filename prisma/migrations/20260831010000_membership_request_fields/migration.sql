-- Une demande d'adhesion ne portait que clubId + memberId + status : le
-- responsable qui devait l'accepter ou la refuser ne voyait qu'un nom.
ALTER TABLE "ClubMembership" ADD COLUMN "motivation" TEXT;
ALTER TABLE "ClubMembership" ADD COLUMN "contact" TEXT;
