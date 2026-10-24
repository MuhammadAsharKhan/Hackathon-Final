import { useState } from "react";
import CompanySettings from "@/components/organization/CompanySettings";
import DepartmentsPanel from "@/components/organization/DepartmentsPanel";
import DesignationsPanel from "@/components/organization/DesignationsPanel";
import HolidaysPanel from "@/components/organization/HolidaysPanel";
import LeaveTypesPanel from "@/components/organization/LeaveTypesPanel";
import PageHeader from "@/components/ui/PageHeader";
import Tabs, { tabId, tabPanelId } from "@/components/ui/Tabs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const TABS = [
  { id: "company", label: "Company" },
  { id: "departments", label: "Departments" },
  { id: "designations", label: "Designations" },
  { id: "leave-types", label: "Leave types" },
  { id: "holidays", label: "Holidays" },
];

const PANELS = {
  company: CompanySettings,
  departments: DepartmentsPanel,
  designations: DesignationsPanel,
  "leave-types": LeaveTypesPanel,
  holidays: HolidaysPanel,
};

export default function Organization() {
  useDocumentTitle("Organization");

  const [tab, setTab] = useState("company");
  const ActivePanel = PANELS[tab];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization"
        description="Company rules, departments, designations, leave types and holidays."
      />

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        idPrefix="organization"
        label="Organization sections"
      />

      <div
        role="tabpanel"
        id={tabPanelId("organization", tab)}
        aria-labelledby={tabId("organization", tab)}
        className="pt-2"
      >
        <ActivePanel />
      </div>
    </div>
  );
}
