import dynamic from "next/dynamic";
import Head from "next/head";
import type { NextPage } from "next";

const BcBackroadsMap = dynamic(
  () => import("@/components/bc-backroads/BcBackroadsMap"),
  { ssr: false },
);

type ImmersivePage = NextPage & { immersive?: boolean };

const BcBackroadsPage: ImmersivePage = () => (
  <>
    <Head>
      <title>BC Backroads · Adventure Moto Field Map</title>
      <meta
        content="Explore researched dual-sport and adventure-motorcycle routes across British Columbia and the Canadian Rockies."
        name="description"
      />
    </Head>
    <BcBackroadsMap />
  </>
);

BcBackroadsPage.immersive = true;

export default BcBackroadsPage;
