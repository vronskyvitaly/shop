// Общие преобразования для DTO (@Transform из class-transformer)

// «  текст  » → «текст»
export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Для необязательных полей: пустая строка → null (поле очищено)
export const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;
