import { Form } from "react-bootstrap";
import ReactSelect, { createFilter } from "react-select";
import { Controller } from "react-hook-form";

// react-select with bootstrap formatting and react-hook-form props
export default function SelectHookForm({
  name,
  label,
  options,
  disabled,
  className,
  labelClass,
  control,
  rules,
  defaultValue,
  error,
  ...rest
}) {
  const selectStyles = {
    styles: {
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      container: (base) => ({
        ...base,
        flex: 1,
      }),
      singleValue: ({ maxWidth, position, top, transform, ...otherStyles }) => ({ ...otherStyles }),
      menu: (base) => ({
        ...base,
        width: "max-content",
        minWidth: "100%",
        // override border radius to match the box
        borderRadius: 0,
        // kill the gap
        marginTop: 0,
      }),
      control: (base, state) => ({
        ...base,
        // match with the menu
        borderRadius: state.isFocused ? "3px 3px 0 0" : 3,
        // Apply error styling when validation fails
        borderColor: error ? '#dc3545' : state.isFocused ? base.borderColor : base.borderColor,
        '&:hover': {
          borderColor: error ? '#dc3545' : base.borderColor,
        },
      }),
      menuList: (base) => ({
        ...base,
        // kill the white space on first and last option
        padding: 0,
      }),
    },
    menuPortalTarget: document.body,
    filterOption: createFilter({ ignoreAccents: false }),
  };

  return (
    <Form.Group controlId={name} className={className}>
      {label && <Form.Label className={labelClass}>{label}</Form.Label>}
      <Controller
        name={name}
        control={control}
        rules={rules}
        defaultValue={defaultValue}
        render={({ field }) => (
          <ReactSelect
            {...selectStyles}
            {...field}
            name={name}
            inputId={name}
            options={options}
            isDisabled={disabled}
            value={options.filter(e => field.value.includes(e.value))}
            onChange={(value) => field.onChange(value.map((e) => e.value))}
            {...rest}
          />
        )}
      />
      {error && (
        <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
          {error.message}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
}
