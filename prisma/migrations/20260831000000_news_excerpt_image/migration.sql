-- Le formulaire de redaction envoyait `excerpt` et `image` depuis le debut :
-- le modele n'avait aucune colonne pour les recevoir, et les deux etaient
-- silencieusement jetes a chaque soumission d'article.
ALTER TABLE "News" ADD COLUMN "excerpt" TEXT;
ALTER TABLE "News" ADD COLUMN "imageUrl" TEXT;
