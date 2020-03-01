import format from 'date-fns/format';

export const formatDatetime = (val) => {
  if (!val) return '----';
  return format(val, 'yyyy-MM-dd @ h:mma');
};

export const formatDate = (val) => {
  if (!val) return '----';
  return format(val, 'yyyy-MM-dd');
};
