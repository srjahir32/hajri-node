/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * bootstrap-datepicker shows its popup on the input's focus and never hides it on a repeated click, so a second click on an open
 * picker leaves it open, and once hidden the still-focused input no longer fires the focus that re-shows it. mousedown fires before
 * the focus that opens it, so it records whether the picker was already open; click then hides an open picker and shows a closed one.
 * Call after `.datepicker(...)`; undo with `$el.off('.reclick')`.
 */
export function toggleOnReclick($el: any) {
  let wasOpen = false;
  $el
    .off('.reclick')
    .on('mousedown.reclick', () => {
      wasOpen = !!$el.data('datepicker')?.picker?.is(':visible');
    })
    .on('click.reclick', () => {
      $el.datepicker(wasOpen ? 'hide' : 'show');
      wasOpen = false;
    });
}
