// Fonction serverless exposée à Vercel.
//
// Le handler réel est écrit en TypeScript et compilé par `nest build` (tsc), et
// non par le bundler de Vercel : NestJS repose sur `emitDecoratorMetadata` pour
// son injection de dépendances, métadonnées que seul tsc émet de façon fiable.
// Ce fichier n'est donc qu'un pont vers la sortie de build.
module.exports = require('../dist/src/serverless').default;
