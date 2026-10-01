import type { ComponentPropsWithoutRef } from "react";
import Image from "next/image";
import { Note } from "./Note";
import { Codepen } from "./Codepen";
import { SuperConductor } from "./SuperConductor";
import {
  BinaryBreakdown,
  PrefixMatchVisualizer,
  TCAMLookup,
  TCAMvsRAM,
  PrefixCompression,
} from "./TCAMVisualizer";
import {
  LUTExplorer,
  CLBDiagram,
  SynthesisFlow,
  FPGAFabric,
  FPGASimulator,
  RoutingFabric,
  DesignComparison,
} from "./FPGAVisualizer";
import {
  ExpectationsComparison,
  HotStockLossExample,
  NoEdgeMonteCarlo,
  ProfessionalFundCostEvidence,
  RetailActivityEvidence,
  RetailPerformanceEvidence,
  TechnicalNote,
  WealthCreationIllustration,
} from "./MarketPrinciples";
import { SmithManoeuvrePlanner } from "./SmithManoeuvrePlanner";
import { MortgageRatePlanner } from "./MortgageRatePlanner";
function ArticleTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="table-scroll" role="region" aria-label="Scrollable table" tabIndex={0}>
      <table {...props} />
    </div>
  );
}

export const components = {
  table: ArticleTable,
  Image,
  Note,
  Codepen,
  SuperConductor,
  BinaryBreakdown,
  PrefixMatchVisualizer,
  TCAMLookup,
  TCAMvsRAM,
  PrefixCompression,
  LUTExplorer,
  CLBDiagram,
  SynthesisFlow,
  FPGAFabric,
  FPGASimulator,
  RoutingFabric,
  DesignComparison,
  ExpectationsComparison,
  HotStockLossExample,
  NoEdgeMonteCarlo,
  ProfessionalFundCostEvidence,
  RetailActivityEvidence,
  RetailPerformanceEvidence,
  TechnicalNote,
  WealthCreationIllustration,
  SmithManoeuvrePlanner,
  MortgageRatePlanner,
};
