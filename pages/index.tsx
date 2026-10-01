import type { NextPage } from "next";
import Head from "next/head";
import siteConfig from "@/data/siteConfig";

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>{siteConfig.siteName}</title>
        <meta name="description" content={siteConfig.siteDescription} />
        <meta property="og:url" content={siteConfig.siteUrl} />
        <meta property="og:title" content={siteConfig.siteName} />
        <meta property="og:description" content={siteConfig.siteDescription} />
        <meta
          property="og:image"
          content={`${siteConfig.siteUrl}${siteConfig.siteThumbnail}`}
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={siteConfig.siteName} />
        <meta name="twitter:description" content={siteConfig.siteDescription} />
        <meta
          name="twitter:image"
          content={`${siteConfig.siteUrl}${siteConfig.siteThumbnail}`}
        />
      </Head>
      <div className="m-auto px-4 md:px-10">
        <div id="intro-section" className="py-5 flex flex-col md:flex md:flex-row">
          <div className="flex flex-col text-xl justify-around">
            <p>
              Hi, I&apos;m <b>Konrad Staniszewski</b>
            </p>
            <br/>
            <p>
              Some things about me:
            </p>
            <ul className="list-disc mx-6">
              <li>I studied Computer Engineering, Software Specialization at the University of Alberta.</li>
              <li>I&apos;m currently working at Arista Networks.</li>
            </ul>
            <br/>
            <p>A few things I believe:</p>
            <ul className="list-disc mx-6">
              <li>
                Advancing technology (<a className="text-sky-400" href="https://en.wikipedia.org/wiki/The_Beginning_of_Infinity">knowledge</a>)
                is our duty and right.
              </li>
              <li>Form ≹ Function.</li>
              <li>
                <a className="text-sky-400" href="/images/raptor-engine.jpg">Good engineering </a>
                is as moving as a piece of <a className="text-sky-400" href="https://en.wikipedia.org/wiki/Henri-Paul_Motte#/media/File:Vercing%C3%A9torix_se_rend_%C3%A0_C%C3%A9sar_1886_HPMotte.jpg">art</a> or music.</li>
              <li>It pays to study history.</li>
              <li>Paul Graham&apos;s <a className="text-sky-400" href="https://www.paulgraham.com/articles.html">essays</a> deserve your attention.</li>
              <li>Life is best lived enjoyed. 🙂</li>
            </ul>
            <br/>
            <p>Personally Inspiring Writing:</p>
            <ul className="list-disc mx-6">
              <li><a className="text-sky-400" href="https://www.palladiummag.com/2023/08/16/the-only-reason-to-explore-space/">Why should we reach for the stars?</a></li>
              <li><a className="text-sky-400" href="https://www.piratewires.com/p/techno-industrialist-manifesto">The techno-industrialist manifesto</a></li>
              <li><a className="text-sky-400" href="https://writings.stephenwolfram.com/2019/02/seeking-the-productive-life-some-details-of-my-personal-infrastructure/">Stephen Wolfram&apos;s personal productivity infrastructure.</a></li>
            </ul>
            <br/>
            <p>Reach me: <a className="text-sky-400" href="mailto:contact@konradstaniszewski.com">contact@konradstaniszewski.com</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
