import type { Metadata } from "next";
import { ReconciliationStudio } from "./studio";
import "./studio.css";

export const metadata: Metadata = {
  title: "Statement reconciliation | Photon Trail",
  description:
    "Reconcile a fictional statement, replay an interrupted import and review a ranked merchant match.",
};

export default function DemoPage() {
  return <ReconciliationStudio />;
}
