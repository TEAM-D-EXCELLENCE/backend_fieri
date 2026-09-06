#!/usr/bin/env bash
#
# Baseline d'une base de production qui n'a jamais connu les migrations.
#
# ── Le probleme que ce script resout ──────────────────────────────────────
#
# Jusqu'au 19 aout, `vercel-build` utilisait `prisma db push --accept-data-loss`.
# La base de production a donc ete faconnee directement depuis `schema.prisma`,
# sans jamais renseigner la table `_prisma_migrations`.
#
# Depuis que le deploiement utilise `prisma migrate deploy`, celui-ci refuse de
# travailler sur cette base :
#
#     Error: P3005
#     The database schema is not empty.
#
# Le build Vercel echoue donc a sa PREMIERE commande, et aucun changement
# serveur n'atteint plus la production — sans que rien ne le signale ailleurs
# que dans le journal de build.
#
# La correction est un « baseline » : declarer appliquees les migrations que la
# base reflete DEJA, sans rejouer leur SQL, pour que les suivantes s'appliquent
# normalement. C'est une operation a faire UNE FOIS.
#
# ── Usage ─────────────────────────────────────────────────────────────────
#
#     DATABASE_URL='postgresql://…' ./scripts/baseline-production.sh --liste
#     DATABASE_URL='postgresql://…' ./scripts/baseline-production.sh --jusqu-a 20260819000000_add_member_signature_url
#
# `--liste` n'ecrit rien : il montre l'etat de la base et les migrations
# connues. `--jusqu-a` marque appliquees toutes les migrations jusqu'a celle
# nommee (incluse), puis lance le deploiement et controle la derive.
#
# ⚠️ Ne marquez appliquee QUE ce que la base contient reellement. Declarer
# appliquee une migration dont les tables n'existent pas laisse un schema
# incomplet que Prisma croira a jour — l'erreur ne se verra qu'a l'execution.

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL n'est pas defini. Pointez-le vers la base a corriger." >&2
  exit 1
fi

MIGRATIONS=$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)

# `prisma migrate status` ne distingue pas les deux situations qui produisent
# la meme phrase « migrations have not yet been applied » : une base VIDE, et
# une base pleine sans historique. Seule la seconde exige un baseline, et c'est
# la seule que `migrate deploy` refuse. On regarde donc si la base contient
# quelque chose, en demandant a Prisma le SQL qui la ramenerait a vide.
etat_base() {
  echo "── Etat de la base ──"
  local vers_vide statut
  vers_vide=$(npx --yes prisma migrate diff --from-url "$DATABASE_URL" --to-empty --script 2>/dev/null || true)
  statut=$(npx --yes prisma migrate status 2>&1 || true)

  local pleine=no
  grep -qi "DROP TABLE" <<<"$vers_vide" && pleine=yes

  if grep -q "Database schema is up to date" <<<"$statut"; then
    echo "  Historique present et a jour : aucun baseline necessaire."
  elif [[ "$pleine" == "yes" ]] && grep -q "have not yet been applied" <<<"$statut"; then
    echo "  La base contient des tables, mais AUCUNE migration n'y est enregistree."
    echo "  C'est la signature du façonnage par 'db push' — et la cause du P3005"
    echo "  qui fait echouer le build."
  elif [[ "$pleine" == "no" ]]; then
    echo "  Base vide : pas de baseline a faire, 'prisma migrate deploy' suffit."
  else
    echo "$statut" | sed 's/^/  /' | tail -15
  fi
  echo ""
}

case "${1:-}" in
  --liste)
    etat_base
    echo "── Migrations du depot, dans l'ordre ──"
    echo "$MIGRATIONS" | nl -w2 -s'. ' | sed 's/^/  /'
    echo ""
    echo "Relancez avec --jusqu-a <nom> pour marquer appliquees celles que la"
    echo "base contient deja. En cas de doute, verifiez la presence d'une table"
    echo "introduite par la migration suivante :"
    echo "  psql \"\$DATABASE_URL\" -c '\\dt'"
    ;;

  --jusqu-a)
    CIBLE="${2:-}"
    if [[ -z "$CIBLE" ]] || ! grep -qx "$CIBLE" <<<"$MIGRATIONS"; then
      echo "Migration inconnue : « ${CIBLE:-(aucune)} ». Utilisez --liste." >&2
      exit 1
    fi

    etat_base
    echo "── Baseline : marquage sans rejouer le SQL ──"
    while read -r m; do
      npx --yes prisma migrate resolve --applied "$m" >/dev/null 2>&1 \
        && echo "  ✓ $m" || echo "  · $m (deja marquee)"
      [[ "$m" == "$CIBLE" ]] && break
    done <<<"$MIGRATIONS"

    echo ""
    echo "── Application des migrations restantes ──"
    npx --yes prisma migrate deploy

    echo ""
    echo "── Controle de derive ──"
    # Ce que le schema declare et que la base n'a pas. Sur une base issue de
    # `db push`, il reste typiquement des index declares au schema mais jamais
    # crees : le baseline ne les fabrique pas, puisqu'il ne rejoue rien.
    RATTRAPAGE=$(npx --yes prisma migrate diff \
      --from-url "$DATABASE_URL" \
      --to-schema-datamodel prisma/schema.prisma \
      --script 2>/dev/null || true)

    if [[ -z "${RATTRAPAGE// }" ]] || grep -q "^-- This is an empty migration" <<<"$RATTRAPAGE"; then
      echo "  ✓ La base correspond exactement a schema.prisma."
    else
      echo "  ⚠ Il reste des ecarts. SQL de rattrapage :"
      echo ""
      sed 's/^/    /' <<<"$RATTRAPAGE"
      echo ""
      echo "  Appliquez-le a CETTE base uniquement :"
      echo "      psql \"\$DATABASE_URL\" -f rattrapage.sql"
      echo ""
      echo "  Ne le versionnez PAS comme migration tant que la CI est verte :"
      echo "  son job « Migrations Prisma » rejoue tout l'historique sur une base"
      echo "  vierge et verifie l'absence de derive. S'il passe, l'historique"
      echo "  produit deja ces objets — ils manquent ici parce que le baseline"
      echo "  marque les migrations sans rejouer leur SQL. Les versionner les"
      echo "  ferait creer deux fois sur une base neuve."
      echo "  Si en revanche la CI echoue sur la derive, alors c'est bien une"
      echo "  migration qui manque au depot : versionnez-la."
    fi
    ;;

  *)
    sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
