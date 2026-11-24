import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useWatch } from "react-hook-form";
import SelectHookForm from "./selectHookForm";
import jpsurv from "@/test/fixtures/jpsurv.json";

const intervalOptions = [...new Set(jpsurv.fullpredicted.map((e) => e.Interval))].map((e) => ({ label: e, value: e }));

function IntervalsForm({ defaultValues = { intervalsD: [5] }, ...props }) {
  const { control } = useForm({ defaultValues });
  const intervals = useWatch({ control, name: "intervalsD" });
  return (
    <>
      <SelectHookForm
        name="intervalsD"
        label="Years Since Diagnosis"
        options={intervalOptions}
        control={control}
        isMulti
        {...props}
      />
      <output data-testid="form-value">{JSON.stringify(intervals ?? null)}</output>
    </>
  );
}

function formValue() {
  return JSON.parse(screen.getByTestId("form-value").textContent);
}

async function chooseOption(user, label) {
  await user.click(screen.getByLabelText("Years Since Diagnosis"));
  await user.click(await screen.findByRole("option", { name: label }));
}

describe("SelectHookForm: JPSurv Years Since Diagnosis", () => {
  it("shows the default interval as selected", () => {
    render(<IntervalsForm />);

    expect(screen.getByRole("button", { name: "Remove 5" })).toBeInTheDocument();
    expect(formValue()).toEqual([5]);
  });

  it("adds a chosen interval to the form value", async () => {
    const user = userEvent.setup();
    render(<IntervalsForm />);

    await chooseOption(user, "1");

    expect(formValue()).toEqual([5, 1]);
  });

  it("removes an interval from the form value", async () => {
    const user = userEvent.setup();
    render(<IntervalsForm defaultValues={{ intervalsD: [1, 5] }} />);

    await user.click(screen.getByRole("button", { name: "Remove 1" }));

    expect(formValue()).toEqual([5]);
  });

  it("starts empty and accepts a selection when the field has no default value", async () => {
    const user = userEvent.setup();
    render(<IntervalsForm defaultValues={{}} />);

    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();

    await chooseOption(user, "5");

    expect(formValue()).toEqual([5]);
  });

  it("shows the validation message", () => {
    render(<IntervalsForm error={{ message: "Required" }} />);

    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("can be disabled", () => {
    render(<IntervalsForm disabled />);

    expect(screen.getByLabelText("Years Since Diagnosis")).toBeDisabled();
  });
});
