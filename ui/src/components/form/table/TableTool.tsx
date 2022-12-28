import { Table } from "semantic-ui-react";
import { keyToLabel } from "./utils";
import * as React from "react";
import * as R from "remeda";

export default function TableToolDisplay({
  metadata,
  updateGlobalFormState,
  updateUniqueIdsFormState,
}) {
  if (metadata === undefined) return <></>;

  const sortFormFieldsDataForTableTool = (form) => {
    let keyValueSortedObject = form.fields.reduce(
      (accumulatedFields, currentField) => {
        return { ...accumulatedFields, [currentField.key]: currentField.value };
      },
      {}
    );

    let referencesOfOtherFormPrimaryKeysUsedWithinCurrentForm =
      form.formReferenceKeys.reduce(
        (accumulatedFields, currentField) => ({
          ...accumulatedFields,
          ...currentField.formPrimaryIdentifierKeys,
        }),
        {}
      );

    return {
      values: keyValueSortedObject,
      references: referencesOfOtherFormPrimaryKeysUsedWithinCurrentForm,
      primaryFormIdentifier: form.formPrimaryIdentifierKeys,
    };
  };

  const sortHeadersForTableTool = (form) => {
    let reference = form.formReferenceKeys.reduce(
      (accumulatedFields, currentField) => ({
        ...accumulatedFields,
        ...currentField.formPrimaryIdentifierKeys,
      }),
      {}
    );

    return [
      ...Object.keys(form.formPrimaryIdentifierKeys),
      ...Object.keys(reference),
      ...form.fields.map((fld) => fld.key),
    ];
  };

  const onTableToolRowClicked = (fields, keys) => {
    // regular expression to collect the dates and convert them to Date object
    const re = /\d{4}-\d{2}-\d{2}/g; // FIX ME: Make more specific to YYYY-MM-DD
    // check if any of the fields is Date parsable
    // if so change it to a Date Object
    // Reason is react-Datepicker only takes null or a Date Object
    Object.keys(fields).forEach((key) => {
      // TODO: improve filter to find the dates fields
      // check if the value can Date parse, not a Integer/Float/Number and meets the regular expression
      if (re.exec(fields[key]) !== null) {
        fields[key] = new Date(fields[key]);
      }
    });

    // change the global state form
    updateGlobalFormState(fields);
    // change Unique Ids within the Form State
    updateUniqueIdsFormState(keys);
  };

  const typeofdisplay = "connectedFormsReferencingSubmitter" in metadata[0]
      ? metadata[0].connectedFormsReferencingSubmitter
      : metadata;

  if (!typeofdisplay.length) return <></>;
  
  const sortedHeaders = sortHeadersForTableTool(typeofdisplay[0]);

  return (
    <>
      <Table fixed selectable aria-labelledby="header">
        <Table.Header>
          <Table.Row>
            {sortedHeaders.map((p) => {
              return <Table.HeaderCell>{keyToLabel(p)}</Table.HeaderCell>;
            })}
          </Table.Row>
        </Table.Header>

        {/* FIX ME WHEN THE FIELD IS A DATE DISPLAY ONLY YYYY-MMM */}
        <Table.Body>
          {typeofdisplay.map((form) => {
            let { values, references, primaryFormIdentifier } =
              sortFormFieldsDataForTableTool(form);
            let sortedFields = {
              ...primaryFormIdentifier,
              ...references,
              ...values,
            };
            return (
              <Table.Row
                onClick={() => {
                  onTableToolRowClicked(values, {
                    ...primaryFormIdentifier,
                    ...references,
                  });
                }}
              >
                {sortedHeaders.map((fld) => {
                  let cell = sortedFields[fld];
                  const re = /\d{4}-\d{2}-\d{2}/g; // FIX ME: Make more specific to YYYY-MM-DD

                  if (re.exec(sortedFields[fld])) {
                    cell = new Date(cell);
                    cell = `${cell.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    })}`;
                  }
                  return <Table.Cell>{cell}</Table.Cell>;
                })}
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </>
  );
}
