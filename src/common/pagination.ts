/** Bloc de pagination, présent uniquement si la requête fournit `page` et `limit`. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Enveloppe standard des listes paginées exposées par l'API. */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination?: PaginationMeta;
}
