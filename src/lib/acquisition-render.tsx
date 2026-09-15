import { render } from "react-email";
import { AcquisitionOutreachEmail, type AcquisitionOutreachEmailProps } from "@/emails/acquisition-outreach";

export async function renderOutreachHtml(props: AcquisitionOutreachEmailProps) {
  return render(<AcquisitionOutreachEmail {...props} />);
}

export async function renderOutreachText(props: AcquisitionOutreachEmailProps) {
  return render(<AcquisitionOutreachEmail {...props} />, { plainText: true });
}
