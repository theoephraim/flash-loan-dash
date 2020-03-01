import Vue from 'vue';
import TableComponent from 'vue-table-component/src';
import '@/assets/style/components/table-component.less';

import TableColumn2 from '@/components/general/table-column2';

// register the table components globally
// and we can also pass in settings

Vue.use(TableComponent, {
  // tableClass: '',
  // theadClass: '',
  // tbodyClass: '',
  // filterPlaceholder: 'Filter table…',
  // filterNoResults: 'There are no matching rows',
});

Vue.component('table-column2', TableColumn2);


export const tableFormatters = {
  date: (val) => val,

};
