import React from "react";
export default () => (
  <>
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full transition-all duration-300 bg-lime-50/80 backdrop-blur-xl shadow-sm border-b border-lime-100/50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between transition-all duration-300 h-14 md:h-16">
            <a
              className="flex items-center gap-2 z-10"
              data-discover="true"
              href="/"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-lime-100 text-white">
                <span className="text-base">{"🔗"}</span>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lime-600 to-lime-500">
                {"Linklime"}
              </span>
            </a>
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              <a
                href="#features"
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-lime-500 transition-colors"
              >
                {"Features"}
              </a>
              <a
                href="#pricing"
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-lime-500 transition-colors"
              >
                {"Pricing"}
              </a>
              <div className="relative group px-3 py-2">
                <button className="flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 group-hover:text-lime-500 transition-colors">
                  {"Resources"}
                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDRiMWIyNTMuanN4 />
                </button>
                <div className="absolute left-0 top-full opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 bg-white rounded-lg shadow-lg border border-slate-200 min-w-[240px] py-2 z-50">
                  <a
                    href="#"
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-lime-500"
                  >
                    {"Documentation"}
                  </a>
                  <a
                    href="#"
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-lime-500"
                  >
                    {"Blog"}
                  </a>
                  <a
                    href="#"
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-lime-500"
                  >
                    {"Case Studies"}
                  </a>
                </div>
              </div>
              <a
                href="#contact"
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-lime-500 transition-colors"
              >
                {"Contact"}
              </a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <a
                href="#login"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              >
                {"Log in"}
              </a>
              <a
                href="#signup"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground h-10 px-4 py-2 bg-lime-500 hover:bg-lime-600 shadow-sm"
              >
                {"Get Started"}
              </a>
            </div>
            <button className="md:hidden z-10" aria-label="Toggle menu">
              <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMzdjYjVjNmIuanN4 />
            </button>
            <div className="fixed inset-0 bg-white pt-20 px-4 md:hidden transition-all duration-300 ease-in-out transform translate-x-full opacity-0 pointer-events-none">
              <div className="flex flex-col gap-6">
                <a
                  href="#features"
                  className="text-lg font-medium text-slate-800 border-b border-slate-100 pb-4"
                >
                  {"Features"}
                </a>
                <a
                  href="#pricing"
                  className="text-lg font-medium text-slate-800 border-b border-slate-100 pb-4"
                >
                  {"Pricing"}
                </a>
                <div className="border-b border-slate-100 pb-4">
                  <div className="text-lg font-medium text-slate-800 mb-2">
                    {"Resources"}
                  </div>
                  <div className="ml-4 flex flex-col gap-3">
                    <a href="#" className="text-slate-600">
                      {"Documentation"}
                    </a>
                    <a href="#" className="text-slate-600">
                      {"Blog"}
                    </a>
                    <a href="#" className="text-slate-600">
                      {"Case Studies"}
                    </a>
                  </div>
                </div>
                <a
                  href="#contact"
                  className="text-lg font-medium text-slate-800 border-b border-slate-100 pb-4"
                >
                  {"Contact"}
                </a>
                <div className="flex flex-col gap-3 pt-4">
                  <a
                    href="#login"
                    className="inline-flex items-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input dark:border-white/10 bg-background/30 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full justify-center"
                  >
                    {"Log in"}
                  </a>
                  <a
                    href="#signup"
                    className="inline-flex items-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground h-10 px-4 py-2 w-full justify-center bg-lime-500 hover:bg-lime-600"
                  >
                    {"Get Started"}
                  </a>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </header>
      <main className="relative overflow-hidden bg-white pt-16 pb-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
          <div className="absolute -top-[40%] -right-[10%] w-[70%] h-[70%] rounded-full border-[40px] border-lime-500/20" />
          <div className="absolute bottom-[10%] -left-[35%] w-[70%] h-[70%] rounded-full border-[8px] border-lime-500/5" />
        </div>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto mb-16 text-center">
            <div
              className="inline-flex items-center rounded-full bg-lime-400/20 px-3 py-1 text-sm font-medium text-lime-700 mb-5"
              style={{
                opacity: "1",
                transform: "none",
              }}
            >
              <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYzQ0YzY3MDkuanN4 />
              {"AI-Powered SEO Platform"}
            </div>
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6"
              style={{
                opacity: "1",
                transform: "none",
              }}
            >
              {"SEO on Autopilot"}
            </h1>
            <div
              className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto"
              style={{
                opacity: "1",
                transform: "none",
              }}
            >
              <p>
                {
                  "Let Linklime handle your SEO: create optimized content, build winning strategies, and publish to your CMS—automatically."
                }
              </p>
            </div>
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
              style={{
                opacity: "1",
                transform: "none",
              }}
            >
              <div className="relative">
                <button className="inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary hover:bg-primary/90 py-2 h-14 px-8 bg-gradient-to-r from-lime-500 to-lime-400 hover:from-lime-600 hover:to-lime-500 text-black rounded-md font-medium relative group overflow-hidden text-base sm:text-lg">
                  <span className="relative z-10 flex items-center">
                    <span className="flex flex-col sm:flex-row sm:items-center">
                      <span className="text-center sm:text-left">
                        {"Generate a free SEO strategy"}
                      </span>
                      <span className="text-center sm:text-left sm:ml-1">
                        {"in 30 seconds"}
                      </span>
                    </span>
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDE2NTkxMTYuanN4 />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-lime-400 to-lime-300 animate-pulse" />
                </button>
                <span className="absolute inset-0 -z-10 animate-ping bg-lime-400/40 rounded-md" />
                <span className="absolute -inset-2 -z-20 animate-pulse bg-lime-400/20 rounded-xl blur-sm" />
                <span className="absolute -inset-4 -z-30 animate-pulse bg-lime-400/10 rounded-2xl blur-md" />
              </div>
            </div>
          </div>
          <div
            className="relative mx-auto max-w-4xl mt-12"
            style={{
              opacity: "1",
            }}
          >
            <div className="relative">
              <div
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 w-full overflow-hidden"
                style={{
                  opacity: "1",
                  transform: "none",
                }}
              >
                <div className="flex items-center mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-lime-50 mr-3">
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDA4MzViNzQuanN4 />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800">
                    {"Search Rankings"}
                  </h3>
                  <div className="ml-auto">
                    <div
                      className="flex items-center bg-lime-50 px-2.5 py-1 rounded-full border border-lime-200"
                      style={{
                        transform: "scale(1.00015) translateZ(0px)",
                      }}
                    >
                      <div className="h-1.5 w-1.5 mr-1.5 rounded-full bg-lime-500 relative">
                        <div className="absolute inset-0 rounded-full bg-lime-500 animate-ping" />
                      </div>
                      <div className="text-xs font-medium text-lime-700">
                        {"Linklime working automatically"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 max-w-3xl mx-auto">
                  <div className="flex items-center bg-slate-50 rounded-full px-4 py-2.5 mb-6 max-w-xl mx-auto border border-slate-300">
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMGJlNTEyZGQuanN4 />
                    <div className="text-sm text-slate-700">
                      {"best seo strategies 2023"}
                    </div>
                  </div>
                  <div className="space-y-5 max-w-2xl mx-auto">
                    <div
                      className="flex rounded-lg border-2 border-lime-200 bg-lime-50 p-4"
                      style={{
                        transform: "none",
                      }}
                    >
                      <div className="mr-3.5 shrink-0">
                        <div
                          className="h-7 w-7 rounded-full bg-lime-500 text-white flex items-center justify-center text-xs font-bold"
                          style={{
                            opacity: "1",
                          }}
                        >
                          {"1"}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-lime-700">
                          {"yourwebsite.com"}
                        </div>
                        <div className="text-base font-medium text-slate-800 mt-0.5 line-clamp-1">
                          {"The Ultimate SEO Strategy Guide for 2023"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {
                            "Discover the most effective SEO strategies to boost your rankings and drive more traffic to your website..."
                          }
                        </div>
                      </div>
                      <div
                        className="ml-3 shrink-0 flex items-center text-lime-600 text-xs font-medium"
                        style={{
                          opacity: "1",
                        }}
                      >
                        <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDQ1OTMyODIuanN4 />
                        <span>{"+7 positions"}</span>
                      </div>
                    </div>
                    <div className="flex rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                      <div className="mr-3.5 shrink-0">
                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                          {"2"}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-500">
                          {"competitor1.com"}
                        </div>
                        <div className="text-base font-medium text-slate-700 mt-0.5 line-clamp-1">
                          {"SEO Strategies You Need to Know"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {
                            "Learn about the latest SEO strategies that top businesses are using to increase their search visibility..."
                          }
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors hidden sm:flex">
                      <div className="mr-3.5 shrink-0">
                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                          {"3"}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-500">
                          {"competitor2.com"}
                        </div>
                        <div className="text-base font-medium text-slate-700 mt-0.5 line-clamp-1">
                          {"Top SEO Tips for 2023 and Beyond"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {
                            "Our experts have compiled the essential SEO tactics that will help your website rank higher..."
                          }
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors hidden sm:flex">
                      <div className="mr-3.5 shrink-0">
                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                          {"4"}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-500">
                          {"competitor3.com"}
                        </div>
                        <div className="text-base font-medium text-slate-700 mt-0.5 line-clamp-1">
                          {"How to Rank Higher with These SEO Tips"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {
                            "Follow these proven SEO techniques to improve your website's search engine rankings..."
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex items-center px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDdiYjFhMmMuanN4 />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">
                        {"Organic Traffic"}
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-sm font-bold text-slate-800">
                          {"+38%"}
                        </span>
                        <span className="ml-1 text-xs text-lime-600">
                          {"monthly"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODA2ZWE3NGEuanN4 />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">
                        {"Keyword Rankings"}
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-sm font-bold text-slate-800">
                          {"43 in Top 10"}
                        </span>
                        <span className="ml-1 text-xs text-lime-600">
                          {"+12 new"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYWZhZGNjMWMuanN4 />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">
                        {"Traffic Growth"}
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-sm font-bold text-slate-800">
                          {"+187%"}
                        </span>
                        <span className="ml-1 text-xs text-lime-600">
                          {"in 30 days"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className="mt-20 max-w-lg mx-auto text-center"
            style={{
              opacity: "1",
            }}
          >
            <p className="text-sm text-slate-500 font-medium mb-4">
              {"TRUSTED BY INNOVATIVE COMPANIES"}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
              <div className="h-5 w-20 bg-slate-200 rounded opacity-60" />
              <div className="h-5 w-20 bg-slate-200 rounded opacity-60" />
              <div className="h-5 w-20 bg-slate-200 rounded opacity-60" />
              <div className="h-5 w-20 bg-slate-200 rounded opacity-60" />
            </div>
          </div>
        </div>
      </main>
      <section id="features" className="py-20">
        <div className="">
          <div
            className="relative w-full dark-section"
            id="ai-strategy-section"
            data-dark-section="true"
            style={{
              opacity: "1",
              transform: "none",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#111827] to-[#0f172a] -z-10" />
            <div className="max-w-7xl mx-auto px-4 py-24 md:py-32 lg:py-40">
              <div className="max-w-3xl mx-auto text-center mb-16">
                <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mb-6 bg-slate-800/80 text-lime-400">
                  {"AI-Powered Strategy"}
                </div>
                <h3 className="text-3xl md:text-5xl font-bold mb-6 text-white">
                  {"Let AI build your SEO strategy"}
                </h3>
                <p className="text-base md:text-xl mb-8 text-slate-300">
                  {
                    "Our AI analyzes your market and competitors to generate data-driven SEO strategies tailored to your specific business goals."
                  }
                </p>
              </div>
              <div className="max-w-5xl mx-auto">
                <div className="bg-slate-800/70 rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden">
                  <div className="flex border-b border-slate-700/80">
                    <button className="flex-1 px-4 py-3 text-center transition-colors border-b-2 border-lime-500 bg-slate-800/50 text-lime-400 text-sm font-medium">
                      {"Content Plan"}
                    </button>
                    <button className="flex-1 px-4 py-3 text-center transition-colors hover:bg-slate-800/30 text-slate-400 text-sm">
                      {"Keyword Analysis"}
                    </button>
                    <button className="flex-1 px-4 py-3 text-center transition-colors hover:bg-slate-800/30 text-slate-400 text-sm">
                      {"Strategy Overview"}
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-lg bg-slate-700/70 flex items-center justify-center mr-4">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMDBjZTg5YjMuanN4 />
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg">
                            {"Content Schedule"}
                          </div>
                          <div className="text-slate-400 text-sm">
                            <span className="sm:hidden">{"Next 2 days"}</span>
                            <span className="hidden sm:inline">
                              {"Next 3 days"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-lime-500/20 text-lime-400 px-3 py-1 rounded-full text-xs font-medium text-center">
                        <span className="sm:hidden">{"4 content pieces"}</span>
                        <span className="hidden sm:inline">
                          {"6 content pieces"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-5 mb-6">
                      <div className="bg-slate-700/30 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-lime-400 font-semibold">
                            {"Thursday, August 7"}
                          </div>
                          <div className="bg-lime-500/20 text-lime-400 px-2 py-0.5 rounded-full text-xs">
                            <span>{"Today"}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-slate-800/70 rounded-md p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-white text-sm">
                                {"SkillSpark vs Traditional LMS Comparison"}
                              </div>
                              <div className="bg-lime-500/20 text-lime-400 px-2 py-0.5 rounded text-xs">
                                {"Article"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-slate-400 text-xs">
                                {"Priority: High"}
                              </div>
                              <div className="h-1 w-1 bg-slate-500 rounded-full" />
                              <div className="text-slate-400 text-xs">
                                {"2,500 words"}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center">
                              <div className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs">
                                {"In progress"}
                              </div>
                              <div className="ml-auto flex items-center text-xs text-slate-400">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDVmM2ZlODUuanN4 />
                                <span>{"Due 5:00 PM"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-800/70 rounded-md p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-white text-sm">
                                {"How to Measure Employee Skill Growth"}
                              </div>
                              <div className="bg-slate-600/60 text-slate-300 px-2 py-0.5 rounded text-xs">
                                {"Guide"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-slate-400 text-xs">
                                {"Priority: Medium"}
                              </div>
                              <div className="h-1 w-1 bg-slate-500 rounded-full" />
                              <div className="text-slate-400 text-xs">
                                {"1,800 words"}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center">
                              <div className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs">
                                {"Published"}
                              </div>
                              <div className="ml-auto flex items-center text-xs text-slate-400">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDVmM2ZlODUuanN4 />
                                <span>{"9:30 AM"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-lime-400 font-semibold">
                            {"Friday, August 8"}
                          </div>
                          <div className="bg-slate-600/60 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                            <span>{"Tomorrow"}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-slate-800/70 rounded-md p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-white text-sm">
                                {"ROI of AI-Powered Learning Programs"}
                              </div>
                              <div className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">
                                {"Case Study"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-slate-400 text-xs">
                                {"Priority: High"}
                              </div>
                              <div className="h-1 w-1 bg-slate-500 rounded-full" />
                              <div className="text-slate-400 text-xs">
                                {"2,200 words"}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center">
                              <div className="bg-slate-600/40 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                                {"Scheduled"}
                              </div>
                              <div className="ml-auto flex items-center text-xs text-slate-400">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDVmM2ZlODUuanN4 />
                                <span>{"10:00 AM"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-800/70 rounded-md p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-white text-sm">
                                {
                                  "5 Ways to Personalize Employee Learning Paths"
                                }
                              </div>
                              <div className="bg-lime-500/20 text-lime-400 px-2 py-0.5 rounded text-xs">
                                {"Listicle"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-slate-400 text-xs">
                                {"Priority: Medium"}
                              </div>
                              <div className="h-1 w-1 bg-slate-500 rounded-full" />
                              <div className="text-slate-400 text-xs">
                                {"1,500 words"}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center">
                              <div className="bg-slate-600/40 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                                {"Scheduled"}
                              </div>
                              <div className="ml-auto flex items-center text-xs text-slate-400">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDVmM2ZlODUuanN4 />
                                <span>{"2:00 PM"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden sm:block bg-slate-700/30 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-lime-400 font-semibold">
                            {"Saturday, August 9"}
                          </div>
                          <div className="bg-slate-600/60 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                            <span>{"In 2 days"}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-slate-800/70 rounded-md p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-white text-sm">
                                {"SkillSpark Integration Guide for HR Teams"}
                              </div>
                              <div className="bg-slate-600/60 text-slate-300 px-2 py-0.5 rounded text-xs">
                                {"Tutorial"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-slate-400 text-xs">
                                {"Priority: High"}
                              </div>
                              <div className="h-1 w-1 bg-slate-500 rounded-full" />
                              <div className="text-slate-400 text-xs">
                                {"3,000 words"}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center">
                              <div className="bg-slate-600/40 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                                {"Draft ready"}
                              </div>
                              <div className="ml-auto flex items-center text-xs text-slate-400">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDVmM2ZlODUuanN4 />
                                <span>{"9:00 AM"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-800/70 rounded-md p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-white text-sm">
                                {
                                  "Future of AI in Corporate Learning: Expert Interviews"
                                }
                              </div>
                              <div className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs">
                                {"Roundup"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-slate-400 text-xs">
                                {"Priority: Medium"}
                              </div>
                              <div className="h-1 w-1 bg-slate-500 rounded-full" />
                              <div className="text-slate-400 text-xs">
                                {"2,800 words"}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center">
                              <div className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs">
                                {"Need review"}
                              </div>
                              <div className="ml-auto flex items-center text-xs text-slate-400">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDVmM2ZlODUuanN4 />
                                <span>{"3:00 PM"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-700/50 mt-6 pt-4 flex items-center justify-between">
                      <div className="text-slate-400 text-xs">
                        <span className="sm:hidden">
                          {"4 content pieces in next 2 days"}
                        </span>
                        <span className="hidden sm:inline">
                          {"6 content pieces in next 3 days"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <button className="text-lime-400 text-sm font-medium cursor-pointer flex items-center hover:text-lime-300 transition-colors">
                          <span>{"View editorial calendar"}</span>
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDg1OWIzMmQuanN4 />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-slate-800/50 rounded-lg p-5 sm:p-4 border border-slate-700/50">
                    <div className="flex items-center mb-3 sm:mb-2">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZmRiODM2N2MuanN4 />
                      <div className="text-white text-base sm:text-sm font-medium">
                        {"Keyword-driven"}
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm sm:text-xs">
                      {"Strategic keywords with high ROI"}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-5 sm:p-4 border border-slate-700/50">
                    <div className="flex items-center mb-3 sm:mb-2">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMmZiNTlkNGUuanN4 />
                      <div className="text-white text-base sm:text-sm font-medium">
                        {"Data-backed"}
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm sm:text-xs">
                      {"Based on market analysis"}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-5 sm:p-4 border border-slate-700/50">
                    <div className="flex items-center mb-3 sm:mb-2">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMDMzZWVjY2YuanN4 />
                      <div className="text-white text-base sm:text-sm font-medium">
                        {"Actionable"}
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm sm:text-xs">
                      {"Clear implementation steps"}
                    </p>
                  </div>
                </div>
                <div className="mt-10 text-center">
                  <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-fit bg-lime-500 text-white hover:bg-lime-600">
                    {"Try the AI strategy builder"}
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODdjYmQ4MTYuanN4 />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="relative w-full"
            style={{
              opacity: "1",
              transform: "none",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-lime-50 -z-10" />
            <div className="max-w-7xl mx-auto px-4 py-24 md:py-32">
              <div className="mb-16 max-w-3xl mx-auto">
                <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mb-6 bg-slate-200 text-lime-700">
                  {"Content Creation"}
                </div>
                <h3 className="text-3xl md:text-5xl font-bold mb-6 text-slate-800">
                  {"High Performing Content ready for your review"}
                </h3>
                <p className="text-base md:text-xl text-slate-600">
                  {
                    "Create complete, SEO-optimized content in seconds with our AI engine. Our platform generates everything you need for ranking success."
                  }
                </p>
              </div>
              <div className="mb-16">
                <div
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                  style={{
                    opacity: "1",
                    transform: "none",
                  }}
                >
                  <div
                    className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 relative"
                    style={{
                      opacity: "1",
                      transform: "none",
                    }}
                  >
                    <div className="absolute top-0 right-0 bg-lime-500 text-white text-xs font-medium py-1 px-3 rounded-bl-lg rounded-tr-lg">
                      {"Step 1"}
                    </div>
                    <div className="h-14 w-14 rounded-xl bg-lime-100 flex items-center justify-center mb-5">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMTBjYTYwODYuanN4 />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-3">
                      {"Article Generation"}
                    </h4>
                    <p className="text-slate-600 mb-4">
                      {
                        "AI creates complete SEO-optimized articles based on your target keywords and audience."
                      }
                    </p>
                    <div className="flex items-center text-lime-600 text-sm font-medium">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMTZkZTViNjAuanN4 />
                      <span>{"Fully automated"}</span>
                    </div>
                    <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 hidden md:block">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfOTY1ODE4YmIuanN4 />
                    </div>
                  </div>
                  <div
                    className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 relative"
                    style={{
                      opacity: "1",
                      transform: "none",
                    }}
                  >
                    <div className="absolute top-0 right-0 bg-lime-500 text-white text-xs font-medium py-1 px-3 rounded-bl-lg rounded-tr-lg">
                      {"Step 2"}
                    </div>
                    <div className="h-14 w-14 rounded-xl bg-lime-100 flex items-center justify-center mb-5">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfOWM0ZDk2ZWEuanN4 />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-3">
                      {"Image Generation"}
                    </h4>
                    <p className="text-slate-600 mb-4">
                      {
                        "AI creates relevant, high-quality images to accompany your content for better engagement."
                      }
                    </p>
                    <div className="flex items-center text-lime-600 text-sm font-medium">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMTZkZTViNjAuanN4 />
                      <span>{"Fully automated"}</span>
                    </div>
                    <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 hidden md:block">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfOTY1ODE4YmIuanN4 />
                    </div>
                  </div>
                  <div
                    className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 relative"
                    style={{
                      opacity: "1",
                      transform: "none",
                    }}
                  >
                    <div className="absolute top-0 right-0 bg-lime-500 text-white text-xs font-medium py-1 px-3 rounded-bl-lg rounded-tr-lg">
                      {"Step 3"}
                    </div>
                    <div className="h-14 w-14 rounded-xl bg-lime-100 flex items-center justify-center mb-5">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDcyNWM4ZjcuanN4 />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-3">
                      {"Deeplinks"}
                    </h4>
                    <p className="text-slate-600 mb-4">
                      {
                        "Strategic internal links are automatically created to boost SEO and improve user navigation."
                      }
                    </p>
                    <div className="flex items-center text-lime-600 text-sm font-medium">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMTZkZTViNjAuanN4 />
                      <span>{"Fully automated"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden sm:block rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-white mb-16">
                <div className="flex items-center bg-slate-50 border-b border-slate-200 px-6 py-4">
                  <div className="flex space-x-2 mr-4">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-lime-500" />
                  </div>
                  <div className="text-sm font-medium text-slate-700">
                    {"Content Generator"}
                  </div>
                </div>
                <div className="p-8 h-[700px]">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 flex gap-4 h-full">
                      <div className="w-1/5 bg-white rounded-lg p-4 overflow-y-auto shadow-sm border border-slate-200">
                        <div className="text-slate-700 text-sm font-medium mb-4">
                          {"Content Settings"}
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">
                              {"Target Keywords"}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <div className="bg-lime-100 text-lime-700 text-xs px-2 py-1 rounded-md">
                                {"ai content generation"}
                              </div>
                              <div className="bg-lime-100 text-lime-700 text-xs px-2 py-1 rounded-md">
                                {"seo automation"}
                              </div>
                              <div className="bg-lime-100 text-lime-700 text-xs px-2 py-1 rounded-md">
                                {"marketing tools"}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">
                              {"Content Type"}
                            </label>
                            <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900">
                              {"Blog Post"}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">
                              {"Word Count"}
                            </label>
                            <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900">
                              {"1,500 words"}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">
                              {"Features"}
                            </label>
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <div className="h-4 w-4 rounded border border-lime-500 flex items-center justify-center bg-lime-50">
                                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMmNjOTllOWIuanN4 />
                                </div>
                                <span className="text-xs text-slate-700 ml-2">
                                  {"Article text"}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <div className="h-4 w-4 rounded border border-lime-500 flex items-center justify-center bg-lime-50">
                                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMmNjOTllOWIuanN4 />
                                </div>
                                <span className="text-xs text-slate-700 ml-2">
                                  {"Article images"}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <div className="h-4 w-4 rounded border border-lime-500 flex items-center justify-center bg-lime-50">
                                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMmNjOTllOWIuanN4 />
                                </div>
                                <span className="text-xs text-slate-700 ml-2">
                                  {"Deeplinks"}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <div className="h-4 w-4 rounded border border-lime-500 flex items-center justify-center bg-lime-50">
                                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMmNjOTllOWIuanN4 />
                                </div>
                                <span className="text-xs text-slate-700 ml-2">
                                  {"Optimized metadata"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="w-1/4 bg-white rounded-lg p-4 overflow-hidden flex flex-col shadow-sm border border-slate-200">
                        <div className="text-slate-700 text-sm font-medium mb-3 flex items-center">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNGE0M2Q1ZWEuanN4 />
                          {"AI Content Assistant"}
                        </div>
                        <div className="flex-1 overflow-y-auto mb-3 pr-2">
                          <div
                            className="mb-3 mr-8"
                            style={{
                              opacity: "1",
                              transform: "none",
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-lime-100">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfOGZlMjY1ZTQuanN4 />
                              </div>
                              <div className="px-3 py-2 rounded-xl text-xs bg-lime-50 text-slate-700">
                                {
                                  "Hi there! I can help you generate content. What would you like to write about?"
                                }
                              </div>
                            </div>
                          </div>
                          <div
                            className="mb-3 ml-8"
                            style={{
                              opacity: "1",
                              transform: "none",
                            }}
                          >
                            <div className="flex items-start gap-2 flex-row-reverse">
                              <div className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-slate-100">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODAwMmYxNDIuanN4 />
                              </div>
                              <div className="px-3 py-2 rounded-xl text-xs bg-slate-100 text-slate-700">
                                {
                                  "I need an article about AI content generation for SEO"
                                }
                              </div>
                            </div>
                          </div>
                          <div
                            className="mb-3 mr-8"
                            style={{
                              opacity: "1",
                              transform: "none",
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-lime-100">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfOGZlMjY1ZTQuanN4 />
                              </div>
                              <div className="px-3 py-2 rounded-xl text-xs bg-lime-50 text-slate-700">
                                {
                                  "I can create an article about AI content generation focusing on text generation, images, and deeplinks. Would you like me to start?"
                                }
                              </div>
                            </div>
                          </div>
                          <div
                            className="mb-3 ml-8"
                            style={{
                              opacity: "1",
                              transform: "none",
                            }}
                          >
                            <div className="flex items-start gap-2 flex-row-reverse">
                              <div className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-slate-100">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODAwMmYxNDIuanN4 />
                              </div>
                              <div className="px-3 py-2 rounded-xl text-xs bg-slate-100 text-slate-700">
                                {
                                  "Yes, please generate it with all the features!"
                                }
                              </div>
                            </div>
                          </div>
                          <div
                            className="mb-3 mr-8"
                            style={{
                              opacity: "1",
                              transform: "none",
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-lime-100">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfOGZlMjY1ZTQuanN4 />
                              </div>
                              <div className="px-3 py-2 rounded-xl text-xs bg-lime-50 text-slate-700">
                                {"I'm generating your article now..."}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 border-t pt-3">
                          <input
                            type="text"
                            placeholder="Ask the AI for edits..."
                            className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-lime-500"
                            value=""
                          />
                          <button className="bg-lime-500 text-white p-2 rounded-lg hover:bg-lime-600 transition-colors">
                            <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYTQ1MDg1YTkuanN4 />
                          </button>
                        </div>
                      </div>
                      <div className="w-1/2 bg-white rounded-lg p-6 overflow-y-auto shadow-sm border border-slate-200">
                        <div className="text-slate-700 text-sm font-medium mb-3">
                          {"Generated Content"}
                        </div>
                        <div
                          className="space-y-5"
                          style={{
                            opacity: "1",
                          }}
                        >
                          <div className="text-2xl font-bold text-slate-800">
                            {
                              "Three Ways Our AI Content Generator Boosts Your SEO"
                            }
                          </div>
                          <div className="border-l-4 border-lime-500 pl-3 py-1 bg-lime-50/50 mb-4">
                            <div className="flex items-center text-xs text-slate-500 mb-1">
                              <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDQ1MTU4MGQuanN4 />
                              <span>{"AI Generated Content"}</span>
                            </div>
                            <div className="text-sm text-slate-600">
                              {
                                "This article was created in seconds using our AI content generator. It includes text, images, and smart deeplinks to maximize your SEO performance."
                              }
                            </div>
                          </div>
                          <div className="rounded-md bg-slate-100 h-48 mb-4 flex flex-col items-center justify-center">
                            <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNzAxMTcxOWQuanN4 />
                            <div className="text-sm text-slate-500">
                              {"Generating image..."}
                            </div>
                          </div>
                          <div className="text-base text-slate-600 leading-relaxed">
                            {
                              "Creating high-quality content that ranks in search engines is time-consuming and expensive. Our AI content generator solves this problem by automating the entire content creation process while ensuring SEO best practices are followed. Here are three powerful ways our platform helps you create content that performs:"
                            }
                          </div>
                          <div className="text-xl font-bold text-slate-800">
                            {"1. AI-Written Text That Ranks"}
                          </div>
                          <div className="text-base text-slate-600 leading-relaxed">
                            {
                              "Our AI writer creates complete, ready-to-publish content optimized for your target keywords. Unlike basic AI tools, our system understands search intent and incorporates proven SEO techniques:"
                            }
                          </div>
                          <ul className="list-disc pl-5 space-y-2 text-base text-slate-600">
                            <li>
                              {
                                "Long-form articles structured for maximum engagement"
                              }
                            </li>
                            <li>
                              {
                                "Product descriptions crafted to convert visitors"
                              }
                            </li>
                            <li>
                              {
                                "Headlines tested and optimized for click-through rates"
                              }
                            </li>
                          </ul>
                          <div className="text-xl font-bold text-slate-800">
                            {"2. Custom Images For Every Article"}
                          </div>
                          <div className="text-base text-slate-600 leading-relaxed">
                            {
                              "Visual content dramatically increases engagement and sharing. Our platform automatically generates custom images designed specifically for your content:"
                            }
                          </div>
                          <ul className="list-disc pl-5 space-y-2 text-base text-slate-600">
                            <li>
                              {"Eye-catching featured images for each article"}
                            </li>
                            <li>
                              {"Section visuals that explain complex concepts"}
                            </li>
                            <li>
                              {
                                "Social media optimized graphics to drive traffic"
                              }
                            </li>
                          </ul>
                          <div className="rounded-md bg-slate-100 h-32 mb-4 flex items-center justify-center">
                            <div className="text-center">
                              <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNWNiYTQyNzYuanN4 />
                              <div className="text-sm text-slate-500">
                                {"Section image will appear here"}
                              </div>
                            </div>
                          </div>
                          <div className="text-xl font-bold text-slate-800">
                            {"3. Smart Deeplinks For SEO Authority"}
                          </div>
                          <div className="text-base text-slate-600 leading-relaxed">
                            {
                              "Internal linking is essential for SEO success but difficult to implement consistently. Our system creates a strategic internal linking structure automatically:"
                            }
                          </div>
                          <ul className="list-disc pl-5 space-y-2 text-base text-slate-600">
                            <li>
                              {"Internal links to your most important pages"}
                            </li>
                            <li>
                              {"Topic clusters to build topical authority"}
                            </li>
                            <li>
                              {"Conversion-focused calls to action throughout"}
                            </li>
                          </ul>
                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                            <div className="flex items-center">
                              <div className="text-xs font-medium text-slate-600">
                                {"SEO Score:"}
                              </div>
                              <div className="ml-2 bg-lime-100 text-lime-700 text-xs px-2 py-0.5 rounded">
                                {"96/100"}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500">
                              <div className="flex items-center">
                                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfN2U4NGQyZmQuanN4 />
                                <span>{"Generating content..."}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <div className="h-8 w-8 rounded-lg bg-lime-100 flex items-center justify-center mb-3">
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODA2ZWE3NGEuanN4 />
                  </div>
                  <h4 className="text-md font-semibold text-slate-800 mb-1">
                    {"SEO-Ready"}
                  </h4>
                  <p className="text-slate-600 text-xs">
                    {"Fully optimized for search engines"}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <div className="h-8 w-8 rounded-lg bg-lime-100 flex items-center justify-center mb-3">
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDIwNzI3YzEuanN4 />
                  </div>
                  <h4 className="text-md font-semibold text-slate-800 mb-1">
                    {"Fast Generation"}
                  </h4>
                  <p className="text-slate-600 text-xs">
                    {"Create content in seconds, not hours"}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <div className="h-8 w-8 rounded-lg bg-lime-100 flex items-center justify-center mb-3">
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfY2NiZTI4NGYuanN4 />
                  </div>
                  <h4 className="text-md font-semibold text-slate-800 mb-1">
                    {"Bulk Creation"}
                  </h4>
                  <p className="text-slate-600 text-xs">
                    {"Generate multiple pieces at once"}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <div className="h-8 w-8 rounded-lg bg-lime-100 flex items-center justify-center mb-3">
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZjYyZDdkODguanN4 />
                  </div>
                  <h4 className="text-md font-semibold text-slate-800 mb-1">
                    {"Performance"}
                  </h4>
                  <p className="text-slate-600 text-xs">
                    {"Track your content's results"}
                  </p>
                </div>
              </div>
              <div className="mt-12 text-center">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-fit bg-lime-500 text-white hover:bg-lime-600">
                  {"Try the content generator"}
                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODdjYmQ4MTYuanN4 />
                </button>
              </div>
            </div>
          </div>
          <div
            className="relative w-full"
            style={{
              opacity: "1",
              transform: "none",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-lime-50 -z-10" />
            <div className="max-w-7xl mx-auto px-4 py-24 md:py-32">
              <div className="mb-16 max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mb-6 bg-slate-200 text-lime-700">
                  {"Publishing"}
                </div>
                <h3 className="text-3xl md:text-5xl font-bold mb-6 text-slate-800">
                  {"Publish anywhere, automatically"}
                </h3>
                <p className="text-base md:text-xl text-slate-600">
                  {
                    "Seamlessly distribute your optimized content across all your platforms with a single click. No technical setup required."
                  }
                </p>
              </div>
              <div className="mb-20 relative">
                <div className="absolute left-1/2 top-0 transform -translate-x-1/2 bg-white rounded-xl shadow-lg border border-lime-200 p-6 w-64 z-10">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-lime-100 rounded-full flex items-center justify-center">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfOWRlZjcwZDQuanN4 />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{"Linklime"}</h4>
                      <p className="text-sm text-slate-600">
                        {"Content ready to publish"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pt-40 pb-20 px-4 flex justify-center">
                  <div className="relative w-full max-w-5xl mx-auto">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-full w-1 bg-lime-200" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] h-1 bg-lime-200" />
                    <div className="absolute top-1/2 left-[5%] transform -translate-y-1/2 h-24 w-1 bg-lime-200" />
                    <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 h-16 w-1 bg-lime-200" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-20 w-1 bg-lime-200" />
                    <div className="absolute top-1/2 left-3/4 transform -translate-x-1/2 -translate-y-1/2 h-12 w-1 bg-lime-200" />
                    <div className="absolute top-1/2 left-[95%] transform -translate-y-1/2 h-28 w-1 bg-lime-200" />
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 mt-24 bg-lime-500 text-white text-sm font-medium px-4 py-2 rounded-full">
                      {"One-click publishing"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transform hover:scale-105 transition-transform">
                    <div className="mb-4 flex justify-center">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZjA4NDY1NzIuanN4 />
                    </div>
                    <h5 className="text-center font-semibold text-slate-800 mb-1">
                      {"WordPress"}
                    </h5>
                    <div className="text-center text-xs text-lime-600 font-medium">
                      {"Connected"}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transform hover:scale-105 transition-transform">
                    <div className="mb-4 flex justify-center">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNGZkNmFkNjguanN4 />
                    </div>
                    <h5 className="text-center font-semibold text-slate-800 mb-1">
                      {"Framer"}
                    </h5>
                    <div className="text-center text-xs text-slate-500">
                      {"Connect"}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transform hover:scale-105 transition-transform">
                    <div className="mb-4 flex justify-center">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYzBjYjE0NzMuanN4 />
                    </div>
                    <h5 className="text-center font-semibold text-slate-800 mb-1">
                      {"Strapi"}
                    </h5>
                    <div className="text-center text-xs text-slate-500">
                      {"Connect"}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transform hover:scale-105 transition-transform">
                    <div className="mb-4 flex justify-center">
                      <div className="h-10 w-10 flex items-center justify-center">
                        <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNTIzNGIzZjEuanN4 />
                      </div>
                    </div>
                    <h5 className="text-center font-semibold text-slate-800 mb-1">
                      {"Shopify"}
                    </h5>
                    <div className="text-center text-xs text-slate-500">
                      {"Connect"}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transform hover:scale-105 transition-transform">
                    <div className="mb-4 flex justify-center">
                      <div className="h-10 w-10 flex items-center justify-center">
                        <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMjc0ZmYxYWEuanN4 />
                      </div>
                    </div>
                    <h5 className="text-center font-semibold text-slate-800 mb-1">
                      {"Webflow"}
                    </h5>
                    <div className="text-center text-xs text-slate-500">
                      {"Connect"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-8 mb-16">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-br from-lime-500 to-lime-600 p-6">
                    <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfOWEzNjkzMWYuanN4 />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">
                      {"One-Click Publishing"}
                    </h4>
                    <p className="text-lime-50">
                      {
                        "Publish content to multiple platforms simultaneously with just one click."
                      }
                    </p>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-lime-100 flex items-center justify-center">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDg1OWY3M2EuanN4 />
                        </div>
                        <span className="ml-3 text-slate-700">
                          {"Save hours on manual publishing"}
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-lime-100 flex items-center justify-center">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDg1OWY3M2EuanN4 />
                        </div>
                        <span className="ml-3 text-slate-700">
                          {"Maintain consistent branding"}
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-lime-100 flex items-center justify-center">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDg1OWY3M2EuanN4 />
                        </div>
                        <span className="ml-3 text-slate-700">
                          {"Launch campaigns simultaneously"}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6">
                    <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDkyZmJhNTYuanN4 />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">
                      {"Format Adaption"}
                    </h4>
                    <p className="text-slate-300">
                      {
                        "Content automatically formatted for each platform's unique requirements."
                      }
                    </p>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-lime-100 flex items-center justify-center">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDg1OWY3M2EuanN4 />
                        </div>
                        <span className="ml-3 text-slate-700">
                          {"Platform-specific image sizing"}
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-lime-100 flex items-center justify-center">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDg1OWY3M2EuanN4 />
                        </div>
                        <span className="ml-3 text-slate-700">
                          {"Heading and meta tag optimization"}
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-lime-100 flex items-center justify-center">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDg1OWY3M2EuanN4 />
                        </div>
                        <span className="ml-3 text-slate-700">
                          {"Responsive design adjustments"}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-br from-lime-500 to-lime-600 p-6">
                    <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZGJmOGM4NzcuanN4 />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">
                      {"Smart Scheduling"}
                    </h4>
                    <p className="text-lime-50">
                      {
                        "Schedule content for optimal publishing times across different platforms."
                      }
                    </p>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-lime-100 flex items-center justify-center">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDg1OWY3M2EuanN4 />
                        </div>
                        <span className="ml-3 text-slate-700">
                          {"AI-optimized publishing times"}
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-lime-100 flex items-center justify-center">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDg1OWY3M2EuanN4 />
                        </div>
                        <span className="ml-3 text-slate-700">
                          {"Content calendar management"}
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-lime-100 flex items-center justify-center">
                          <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZDg1OWY3M2EuanN4 />
                        </div>
                        <span className="ml-3 text-slate-700">
                          {"Timezone-aware scheduling"}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 mb-16">
                <div className="max-w-3xl mx-auto">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-6 text-lime-500">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfOWMzYzc0N2QuanN4 />
                    </div>
                    <p className="text-lg md:text-xl text-slate-700 mb-8">
                      {
                        "Linklime has completely transformed our content distribution. We used to spend 5+ hours every week publishing content across our WordPress, Shopify, and social channels. Now it takes just minutes. The format adaptation is flawless - content looks perfect everywhere."
                      }
                    </p>
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-slate-200 rounded-full mr-4" />
                      <div className="text-left">
                        <p className="font-semibold text-slate-800">
                          {"Sarah Johnson"}
                        </p>
                        <p className="text-sm text-slate-600">
                          {"Marketing Director, TechCraft"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
                  <div className="text-lime-500 font-bold text-3xl md:text-4xl mb-2">
                    {"15+"}
                  </div>
                  <div className="text-slate-600 text-sm">
                    {"CMS integrations"}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
                  <div className="text-lime-500 font-bold text-3xl md:text-4xl mb-2">
                    {"98%"}
                  </div>
                  <div className="text-slate-600 text-sm">
                    {"Format accuracy"}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
                  <div className="text-lime-500 font-bold text-3xl md:text-4xl mb-2">
                    {"83%"}
                  </div>
                  <div className="text-slate-600 text-sm">{"Time saved"}</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
                  <div className="text-lime-500 font-bold text-3xl md:text-4xl mb-2">
                    {"5M+"}
                  </div>
                  <div className="text-slate-600 text-sm">
                    {"Articles published"}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-fit bg-lime-500 text-white hover:bg-lime-600">
                  {"Try CMS integration"}
                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODdjYmQ4MTYuanN4 />
                </button>
              </div>
            </div>
          </div>
          <div
            className="relative w-full"
            style={{
              opacity: "0",
              transform: "translateY(40px) translateZ(0)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-lime-50 -z-10" />
            <div className="max-w-7xl mx-auto px-4 py-24 md:py-32 lg:py-40">
              <div className="text-center mb-12">
                <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mb-6 bg-slate-200 text-lime-700">
                  {"Analytics"}
                </div>
                <h3 className="text-3xl md:text-5xl font-bold mb-6 text-slate-800">
                  {"Track progress"}
                </h3>
                <p className="text-base md:text-xl mb-10 text-slate-600 max-w-3xl mx-auto">
                  {
                    "Monitor your SEO performance with detailed analytics. Watch your rankings improve and traffic grow with our powerful tracking tools."
                  }
                </p>
                <div className="inline-flex bg-white shadow-sm rounded-lg p-1 mb-12 border border-slate-200">
                  <button className="px-4 py-2 rounded-md text-sm font-medium transition-all bg-lime-500 text-white">
                    {"SEO Dashboard"}
                  </button>
                  <button className="px-4 py-2 rounded-md text-sm font-medium transition-all text-slate-600 hover:text-slate-900">
                    {"Competitor Analysis"}
                  </button>
                </div>
              </div>
              <div className="relative h-[540px] w-full max-w-5xl mx-auto rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                <div className="absolute inset-0 p-8">
                  <div className="h-full flex flex-col">
                    <div className="mb-4">
                      <div className="inline-flex items-center bg-slate-200/80 rounded-md px-3 py-1.5 text-sm text-slate-700 font-medium">
                        <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNjY5ZTVkNzcuanN4 />
                        {"SEO Analytics Dashboard"}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 mb-4 sm:mb-6 shadow-sm border border-slate-200">
                      <div className="flex flex-wrap justify-between items-center">
                        <div className="text-slate-700 text-sm font-medium">
                          {"Performance Overview"}
                        </div>
                        <div className="flex items-center bg-slate-100 rounded-md px-2 py-1 text-xs text-slate-600 mt-1 sm:mt-0">
                          <span>{"Last 30 days"}</span>
                          <div className="ml-1 h-4 w-4 flex items-center justify-center">
                            <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZTc2MjFmZmIuanN4 />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-slate-200">
                        <div className="text-xs text-slate-500 mb-1">
                          {"Organic Traffic"}
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="text-lg sm:text-xl font-bold text-slate-800">
                            {"23,521"}
                          </div>
                          <div className="text-lime-600 text-xs font-medium px-1.5 py-0.5 rounded bg-lime-100 flex items-center">
                            <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMzRmMjZmMWYuanN4 />
                            {"+34.2%"}
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-3 h-6 sm:h-8 flex items-end space-x-1">
                          <div className="flex-1 bg-lime-100 h-2 rounded-sm" />
                          <div className="flex-1 bg-lime-200 h-3 rounded-sm" />
                          <div className="flex-1 bg-lime-300 h-4 rounded-sm" />
                          <div className="flex-1 bg-lime-400 h-5 rounded-sm" />
                          <div className="flex-1 bg-lime-500 h-6 sm:h-7 rounded-sm" />
                          <div className="flex-1 bg-lime-600 h-6 sm:h-8 rounded-sm" />
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-slate-200">
                        <div className="text-xs text-slate-500 mb-1">
                          {"Avg. Position"}
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="text-lg sm:text-xl font-bold text-slate-800">
                            {"3.2"}
                          </div>
                          <div className="text-lime-600 text-xs font-medium px-1.5 py-0.5 rounded bg-lime-100 flex items-center">
                            <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMzRmMjZmMWYuanN4 />
                            {"+2.4"}
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-3 h-6 sm:h-8 flex items-end space-x-1">
                          <div className="flex-1 bg-lime-500 h-6 sm:h-8 rounded-sm" />
                          <div className="flex-1 bg-lime-500 h-5 sm:h-7 rounded-sm" />
                          <div className="flex-1 bg-lime-400 h-4 sm:h-6 rounded-sm" />
                          <div className="flex-1 bg-lime-400 h-3 sm:h-4 rounded-sm" />
                          <div className="flex-1 bg-lime-300 h-2 sm:h-3 rounded-sm" />
                          <div className="flex-1 bg-lime-200 h-1 sm:h-2 rounded-sm" />
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-slate-200 sm:col-span-2 lg:col-span-1">
                        <div className="text-xs text-slate-500 mb-1">
                          {"Keywords Ranking"}
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="text-lg sm:text-xl font-bold text-slate-800">
                            {"142"}
                          </div>
                          <div className="text-lime-600 text-xs font-medium px-1.5 py-0.5 rounded bg-lime-100 flex items-center">
                            <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMzRmMjZmMWYuanN4 />
                            {"+18"}
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-3 h-6 sm:h-8 flex items-end space-x-1">
                          <div className="flex-1 bg-lime-100 h-1 sm:h-2 rounded-sm" />
                          <div className="flex-1 bg-lime-200 h-3 sm:h-4 rounded-sm" />
                          <div className="flex-1 bg-lime-300 h-3 sm:h-4 rounded-sm" />
                          <div className="flex-1 bg-lime-400 h-4 sm:h-5 rounded-sm" />
                          <div className="flex-1 bg-lime-500 h-5 sm:h-6 rounded-sm" />
                          <div className="flex-1 bg-lime-600 h-6 sm:h-8 rounded-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 bg-white rounded-lg p-3 sm:p-4 overflow-y-auto shadow-sm border border-slate-200">
                      <div className="text-slate-700 text-sm font-medium mb-2 sm:mb-3">
                        {"Keyword Ranking Progress"}
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="border border-slate-200 rounded-md p-2 sm:p-3">
                          <div className="flex justify-between items-center mb-1 sm:mb-2">
                            <div className="text-slate-800 text-xs sm:text-sm font-medium">
                              {"seo automation tools"}
                            </div>
                            <div className="flex items-center">
                              <div className="text-slate-800 text-xs sm:text-sm font-medium">
                                {"2"}
                              </div>
                              <div className="text-lime-600 text-xs ml-1">
                                {"+5"}
                              </div>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full">
                            <div
                              className="h-2 bg-lime-500 rounded-full"
                              style={{
                                width: "92%",
                              }}
                            />
                          </div>
                        </div>
                        <div className="border border-slate-200 rounded-md p-2 sm:p-3">
                          <div className="flex justify-between items-center mb-1 sm:mb-2">
                            <div className="text-slate-800 text-xs sm:text-sm font-medium">
                              {"ai content generator"}
                            </div>
                            <div className="flex items-center">
                              <div className="text-slate-800 text-xs sm:text-sm font-medium">
                                {"4"}
                              </div>
                              <div className="text-lime-600 text-xs ml-1">
                                {"+2"}
                              </div>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full">
                            <div
                              className="h-2 bg-lime-500 rounded-full"
                              style={{
                                width: "85%",
                              }}
                            />
                          </div>
                        </div>
                        <div className="border border-slate-200 rounded-md p-2 sm:p-3">
                          <div className="flex justify-between items-center mb-1 sm:mb-2">
                            <div className="text-slate-800 text-xs sm:text-sm font-medium">
                              {"best seo software 2023"}
                            </div>
                            <div className="flex items-center">
                              <div className="text-slate-800 text-xs sm:text-sm font-medium">
                                {"5"}
                              </div>
                              <div className="text-lime-600 text-xs ml-1">
                                {"+7"}
                              </div>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full">
                            <div
                              className="h-2 bg-lime-500 rounded-full"
                              style={{
                                width: "78%",
                              }}
                            />
                          </div>
                        </div>
                        <div className="border border-slate-200 rounded-md p-2 sm:p-3">
                          <div className="flex justify-between items-center mb-1 sm:mb-2">
                            <div className="text-slate-800 text-xs sm:text-sm font-medium">
                              {"keyword research tool"}
                            </div>
                            <div className="flex items-center">
                              <div className="text-slate-800 text-xs sm:text-sm font-medium">
                                {"7"}
                              </div>
                              <div className="text-lime-600 text-xs ml-1">
                                {"+3"}
                              </div>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full">
                            <div
                              className="h-2 bg-lime-500 rounded-full"
                              style={{
                                width: "70%",
                              }}
                            />
                          </div>
                        </div>
                        <div className="border border-slate-200 rounded-md p-2 sm:p-3">
                          <div className="flex justify-between items-center mb-1 sm:mb-2">
                            <div className="text-slate-800 text-xs sm:text-sm font-medium truncate pr-2">
                              {"content optimization guide"}
                            </div>
                            <div className="flex items-center shrink-0">
                              <div className="text-slate-800 text-xs sm:text-sm font-medium">
                                {"9"}
                              </div>
                              <div className="text-lime-600 text-xs ml-1">
                                {"+12"}
                              </div>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full">
                            <div
                              className="h-2 bg-lime-500 rounded-full"
                              style={{
                                width: "65%",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-10 text-center">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-fit bg-lime-500 text-white hover:bg-lime-600">
                  {"Try SEO analytics"}
                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODdjYmQ4MTYuanN4 />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-32">
          <div className="text-center mb-16">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900">
              {"Everything you need for complete SEO management"}
            </h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div
              className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-start"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-lime-50 flex items-center justify-center mb-4">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNjIyNDY5ZjkuanN4 />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-900">
                {"Automated Strategy Generation"}
              </h3>
              <p className="text-slate-600">
                {
                  "AI-powered SEO strategy planning tailored to your specific goals"
                }
              </p>
            </div>
            <div
              className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-start"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-lime-50 flex items-center justify-center mb-4">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYjIzZDMxZmUuanN4 />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-900">
                {"Content Generation"}
              </h3>
              <p className="text-slate-600">
                {
                  "Automatically create SEO-optimized content with artificial intelligence"
                }
              </p>
            </div>
            <div
              className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-start"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-lime-50 flex items-center justify-center mb-4">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZGM0ZDJlNDkuanN4 />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-900">
                {"AI Content Editor"}
              </h3>
              <p className="text-slate-600">
                {
                  "Intuitive editor to define and refine content with AI assistance"
                }
              </p>
            </div>
            <div
              className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-start"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-lime-50 flex items-center justify-center mb-4">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYjI3ZDBkY2MuanN4 />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-900">
                {"CMS Integration"}
              </h3>
              <p className="text-slate-600">
                {
                  "Seamlessly publish optimized content to your favorite CMS platforms"
                }
              </p>
            </div>
            <div
              className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-start"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-lime-50 flex items-center justify-center mb-4">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYjk1NGM4ZTYuanN4 />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-900">
                {"Keyword Research Tool"}
              </h3>
              <p className="text-slate-600">
                {
                  "Discover high-value keywords to develop new content strategies"
                }
              </p>
            </div>
            <div
              className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-start"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-lime-50 flex items-center justify-center mb-4">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZjAyZWQ1YzMuanN4 />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-900">
                {"Rank Tracking"}
              </h3>
              <p className="text-slate-600">
                {"Monitor your positions for all target keywords"}
              </p>
            </div>
            <div
              className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-start"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-lime-50 flex items-center justify-center mb-4">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNzM3YTIzYTcuanN4 />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-900">
                {"Backlink Analysis"}
              </h3>
              <p className="text-slate-600">
                {"Track and analyze your backlink profile growth"}
              </p>
            </div>
            <div
              className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-start"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-lime-50 flex items-center justify-center mb-4">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDgwYjRmZTcuanN4 />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-900">
                {"Technical Audits"}
              </h3>
              <p className="text-slate-600">
                {"Identify and fix technical SEO issues automatically"}
              </p>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <div
            className="mt-24 max-w-3xl mx-auto text-center"
            style={{
              opacity: "0",
              transform: "translateY(20px) translateZ(0)",
            }}
          >
            <button className="inline-flex items-center justify-center text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 py-2 h-12 px-6 bg-lime-500 hover:bg-lime-600 text-white rounded-md font-medium">
              {"Explore all features"}
              <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODdjYmQ4MTYuanN4 />
            </button>
          </div>
        </div>
      </section>
      <section id="pricing" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="inline-flex items-center rounded-full bg-lime-400/20 px-3 py-1 text-sm font-medium text-lime-700 mb-5">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYzQ0YzY3MDkuanN4 />
                {"Pricing"}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900">
                {"Simple, transparent pricing"}
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
                {
                  "Choose the perfect plan for your SEO needs. All plans include core features to improve your search rankings."
                }
              </p>
              <div className="flex items-center justify-center mb-16">
                <span className="px-3 py-1.5 cursor-pointer text-slate-500">
                  {"Monthly billing"}
                </span>
                <div className="w-14 h-7 flex items-center rounded-full p-1 mx-2 bg-lime-100 justify-end">
                  <div className="bg-white h-5 w-5 rounded-full shadow-sm" />
                </div>
                <span className="px-3 py-1.5 cursor-pointer flex items-center gap-2 text-slate-900 font-medium">
                  {"Annual billing"}
                  <span className="bg-lime-100 text-lime-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {"Save 20%"}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div
              className="rounded-lg overflow-hidden border border-slate-200"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {"Starter"}
                </h3>
                <p className="text-slate-600 mb-4">
                  {"Essential tools for growing websites"}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">
                    {"$"}
                    {"99"}
                  </span>
                  <span className="text-slate-600 ml-1">{"/month"}</span>
                  <div className="text-sm text-slate-500 mt-1">
                    {"Billed annually ($"}
                    {"950"}
                    {"/year)"}
                  </div>
                </div>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 w-full h-11 mb-6 bg-white border border-slate-300 hover:bg-slate-50 text-slate-900">
                  {"Get started"}
                </button>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Up to 100 pages monitored"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Weekly SEO reports"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Basic keyword tracking"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Technical SEO audits"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">{"Email support"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="rounded-lg overflow-hidden border border-lime-500 shadow-lg shadow-lime-100"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="bg-lime-500 text-white text-center py-1.5 text-sm font-medium">
                {"Most Popular"}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {"Professional"}
                </h3>
                <p className="text-slate-600 mb-4">
                  {"Advanced features for serious marketers"}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">
                    {"$"}
                    {"199"}
                  </span>
                  <span className="text-slate-600 ml-1">{"/month"}</span>
                  <div className="text-sm text-slate-500 mt-1">
                    {"Billed annually ($"}
                    {"1910"}
                    {"/year)"}
                  </div>
                </div>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 w-full h-11 mb-6 bg-lime-500 hover:bg-lime-600 text-white">
                  {"Get started"}
                </button>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Up to 500 pages monitored"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Daily SEO reports"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Advanced keyword tracking"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Content optimization"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Technical SEO audits"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Backlink analysis"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Priority email support"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">{"API access"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="rounded-lg overflow-hidden border border-slate-200"
              style={{
                opacity: "0",
                transform: "translateY(20px) translateZ(0)",
              }}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {"Enterprise"}
                </h3>
                <p className="text-slate-600 mb-4">
                  {"Custom solutions for large businesses"}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">
                    {"$"}
                    {"499"}
                  </span>
                  <span className="text-slate-600 ml-1">{"/month"}</span>
                  <div className="text-sm text-slate-500 mt-1">
                    {"Billed annually ($"}
                    {"4790"}
                    {"/year)"}
                  </div>
                </div>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 w-full h-11 mb-6 bg-white border border-slate-300 hover:bg-slate-50 text-slate-900">
                  {"Get started"}
                </button>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Unlimited pages monitored"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Real-time SEO monitoring"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Advanced AI recommendations"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">{"Custom reporting"}</span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Dedicated account manager"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">
                      {"Phone & email support"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">{"API access"}</span>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNmYTcxYWIuanN4 />
                    </div>
                    <span className="text-slate-700">{"White labeling"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className="mt-16 max-w-3xl mx-auto bg-slate-50 rounded-lg p-8 border border-slate-200"
            style={{
              opacity: "0",
              transform: "translateY(20px) translateZ(0)",
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {"Need a custom plan?"}
                </h3>
                <p className="text-slate-600">
                  {
                    "Contact us for a tailored solution to meet your specific requirements."
                  }
                </p>
              </div>
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 py-2 flex-shrink-0 h-11 px-5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300">
                {"Contact sales"}
              </button>
            </div>
          </div>
          <div
            className="mt-24 max-w-3xl mx-auto"
            style={{
              opacity: "0",
              transform: "translateY(20px) translateZ(0)",
            }}
          >
            <div className="text-center mb-10">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                {"Frequently asked questions"}
              </h3>
              <p className="text-slate-600">
                {"Everything you need to know about our pricing plans."}
              </p>
            </div>
            <div className="space-y-6">
              <div className="rounded-lg border border-slate-200 p-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2 flex items-center">
                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODRhODYyN2QuanN4 />
                  {"Can I change plans later?"}
                </h4>
                <p className="text-slate-600">
                  {
                    "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, with prorated charges or credits applied to your next billing cycle."
                  }
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2 flex items-center">
                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODRhODYyN2QuanN4 />
                  {"Is there a free trial?"}
                </h4>
                <p className="text-slate-600">
                  {
                    "We offer a 14-day free trial on all plans. No credit card required to start."
                  }
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2 flex items-center">
                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODRhODYyN2QuanN4 />
                  {"What payment methods do you accept?"}
                </h4>
                <p className="text-slate-600">
                  {
                    "We accept all major credit cards, PayPal, and bank transfers for annual plans."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="signup" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div
            className="max-w-3xl mx-auto bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200"
            style={{
              opacity: "0",
              transform: "translateY(20px) translateZ(0)",
            }}
          >
            <div className="bg-lime-500 h-2" />
            <div className="p-8 md:p-12">
              <div className="max-w-2xl mx-auto text-center">
                <div className="inline-flex items-center rounded-full bg-lime-400/20 px-3 py-1 text-sm font-medium text-lime-700 mb-5">
                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYzQ0YzY3MDkuanN4 />
                  {"Get Started"}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900">
                  {"Ready to transform your SEO strategy?"}
                </h2>
                <p className="text-lg text-slate-600 mb-10">
                  {
                    "Join thousands of websites already using Linklime to boost their search rankings and drive more organic traffic."
                  }
                </p>
                <form className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
                  <div className="flex-grow relative">
                    <input
                      type="email"
                      className="flex rounded-md border bg-background/30 px-3 py-2 caret-primary ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-12 text-base w-full border-slate-300"
                      id="email-banner"
                      name="email"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 py-2 h-12 px-6 bg-lime-500 hover:bg-lime-600 text-white font-medium"
                    type="submit"
                  >
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfZjA0MmVhOWUuanN4 />
                    {"Start free trial"}
                  </button>
                </form>
                <p className="mt-4 text-sm text-slate-500">
                  {
                    "Free 14-day trial • No credit card required • Cancel anytime"
                  }
                </p>
              </div>
            </div>
          </div>
          <div
            className="max-w-2xl mx-auto mt-16 text-center"
            style={{
              opacity: "0",
              transform: "translateY(20px) translateZ(0)",
            }}
          >
            <div className="flex justify-center mb-6">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
                <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
                <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
                <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
                <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
              </div>
            </div>
            <blockquote className="text-xl text-slate-700 italic mb-4">
              {
                '"Since implementing Linklime, our organic traffic has increased by 143% and our conversion rate has doubled. The AI-powered insights have been game-changing for our content strategy."'
              }
            </blockquote>
            <div className="text-sm font-medium">
              <span className="text-slate-900">{"Sarah Johnson"}</span>
              <span className="text-slate-500">
                {" • Marketing Director at TechCorp"}
              </span>
            </div>
          </div>
        </div>
      </section>
      <section id="faqs" className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-lime-400/20 px-3 py-1 text-sm font-medium text-lime-700 mb-5">
              <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYzQ0YzY3MDkuanN4 />
              {"Common Questions"}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900">
              {"Got questions about Linklime?"}
            </h2>
            <p className="text-lg text-slate-600">
              {"Find answers to the most common questions, or"}
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 underline-offset-4 hover:underline h-10 py-2 px-1 text-lime-600 hover:text-lime-700"
              >
                {"talk to our team"}
              </a>
            </p>
          </div>
          <div
            className="max-w-3xl mx-auto"
            style={{
              opacity: "0",
              transform: "translateY(20px) translateZ(0)",
            }}
          >
            <div className="space-y-4" data-orientation="vertical">
              <div
                data-state="closed"
                data-orientation="vertical"
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <h3
                  data-orientation="vertical"
                  data-state="closed"
                  className="flex"
                >
                  <button
                    type="button"
                    aria-controls="radix-:R16j3l:"
                    aria-expanded="false"
                    data-state="closed"
                    data-orientation="vertical"
                    id="radix-:R6j3l:"
                    className="flex flex-1 items-center justify-between transition-all [&[data-state=open]>svg]:rotate-180 px-6 py-4 text-left text-lg font-medium hover:no-underline"
                    data-radix-collection-item=""
                  >
                    {"How does Linklime's AI technology improve SEO?"}
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMGQ5OGM1NzguanN4 />
                  </button>
                </h3>
                <div
                  data-state="closed"
                  id="radix-:R16j3l:"
                  hidden
                  role="region"
                  aria-labelledby="radix-:R6j3l:"
                  data-orientation="vertical"
                  className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
                  style={{
                    "--radix-accordion-content-height":
                      "var(--radix-collapsible-content-height)",
                    "--radix-accordion-content-width":
                      "var(--radix-collapsible-content-width)",
                  }}
                />
              </div>
              <div
                data-state="closed"
                data-orientation="vertical"
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <h3
                  data-orientation="vertical"
                  data-state="closed"
                  className="flex"
                >
                  <button
                    type="button"
                    aria-controls="radix-:R1aj3l:"
                    aria-expanded="false"
                    data-state="closed"
                    data-orientation="vertical"
                    id="radix-:Raj3l:"
                    className="flex flex-1 items-center justify-between transition-all [&[data-state=open]>svg]:rotate-180 px-6 py-4 text-left text-lg font-medium hover:no-underline"
                    data-radix-collection-item=""
                  >
                    {"Can I track my website's SEO progress in real-time?"}
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMGQ5OGM1NzguanN4 />
                  </button>
                </h3>
                <div
                  data-state="closed"
                  id="radix-:R1aj3l:"
                  hidden
                  role="region"
                  aria-labelledby="radix-:Raj3l:"
                  data-orientation="vertical"
                  className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
                  style={{
                    "--radix-accordion-content-height":
                      "var(--radix-collapsible-content-height)",
                    "--radix-accordion-content-width":
                      "var(--radix-collapsible-content-width)",
                  }}
                />
              </div>
              <div
                data-state="closed"
                data-orientation="vertical"
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <h3
                  data-orientation="vertical"
                  data-state="closed"
                  className="flex"
                >
                  <button
                    type="button"
                    aria-controls="radix-:R1ej3l:"
                    aria-expanded="false"
                    data-state="closed"
                    data-orientation="vertical"
                    id="radix-:Rej3l:"
                    className="flex flex-1 items-center justify-between transition-all [&[data-state=open]>svg]:rotate-180 px-6 py-4 text-left text-lg font-medium hover:no-underline"
                    data-radix-collection-item=""
                  >
                    {"How long does it take to see results with Linklime?"}
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMGQ5OGM1NzguanN4 />
                  </button>
                </h3>
                <div
                  data-state="closed"
                  id="radix-:R1ej3l:"
                  hidden
                  role="region"
                  aria-labelledby="radix-:Rej3l:"
                  data-orientation="vertical"
                  className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
                  style={{
                    "--radix-accordion-content-height":
                      "var(--radix-collapsible-content-height)",
                    "--radix-accordion-content-width":
                      "var(--radix-collapsible-content-width)",
                  }}
                />
              </div>
              <div
                data-state="closed"
                data-orientation="vertical"
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <h3
                  data-orientation="vertical"
                  data-state="closed"
                  className="flex"
                >
                  <button
                    type="button"
                    aria-controls="radix-:R1ij3l:"
                    aria-expanded="false"
                    data-state="closed"
                    data-orientation="vertical"
                    id="radix-:Rij3l:"
                    className="flex flex-1 items-center justify-between transition-all [&[data-state=open]>svg]:rotate-180 px-6 py-4 text-left text-lg font-medium hover:no-underline"
                    data-radix-collection-item=""
                  >
                    {
                      "Do you offer support for implementing SEO recommendations?"
                    }
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMGQ5OGM1NzguanN4 />
                  </button>
                </h3>
                <div
                  data-state="closed"
                  id="radix-:R1ij3l:"
                  hidden
                  role="region"
                  aria-labelledby="radix-:Rij3l:"
                  data-orientation="vertical"
                  className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
                  style={{
                    "--radix-accordion-content-height":
                      "var(--radix-collapsible-content-height)",
                    "--radix-accordion-content-width":
                      "var(--radix-collapsible-content-width)",
                  }}
                />
              </div>
              <div
                data-state="closed"
                data-orientation="vertical"
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <h3
                  data-orientation="vertical"
                  data-state="closed"
                  className="flex"
                >
                  <button
                    type="button"
                    aria-controls="radix-:R1mj3l:"
                    aria-expanded="false"
                    data-state="closed"
                    data-orientation="vertical"
                    id="radix-:Rmj3l:"
                    className="flex flex-1 items-center justify-between transition-all [&[data-state=open]>svg]:rotate-180 px-6 py-4 text-left text-lg font-medium hover:no-underline"
                    data-radix-collection-item=""
                  >
                    {"Can Linklime help with local SEO?"}
                    <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfMGQ5OGM1NzguanN4 />
                  </button>
                </h3>
                <div
                  data-state="closed"
                  id="radix-:R1mj3l:"
                  hidden
                  role="region"
                  aria-labelledby="radix-:Rmj3l:"
                  data-orientation="vertical"
                  className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
                  style={{
                    "--radix-accordion-content-height":
                      "var(--radix-collapsible-content-height)",
                    "--radix-accordion-content-width":
                      "var(--radix-collapsible-content-width)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="bg-slate-900">
        <section id="contact" className="py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <div className="inline-flex items-center rounded-full bg-lime-400/20 px-3 py-1 text-sm font-medium text-lime-700 mb-5">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYzQ0YzY3MDkuanN4 />
                {"Contact Us"}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900">
                {"Let's Boost Your SEO"}
              </h2>
              <p className="text-lg text-slate-600">
                {
                  "Ready to transform your website's visibility? Our team of SEO experts is here to help you achieve better rankings."
                }
              </p>
            </div>
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-start">
              <div
                className="space-y-8"
                style={{
                  opacity: "0",
                  transform: "translateX(-20px) translateZ(0)",
                }}
              >
                <div>
                  <h3 className="text-2xl font-semibold mb-4 text-slate-900">
                    {"Get in touch"}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {
                      "Have questions about our AI-powered SEO tools? Our team is here to help you boost your search rankings and grow your organic traffic."
                    }
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-lime-400/10 rounded-lg">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYzU3M2I4YjkuanN4 />
                    </div>
                    <div>
                      <h4 className="font-medium text-lg text-slate-900">
                        {"Phone"}
                      </h4>
                      <p className="text-slate-600">{"+1 (234) 567-890"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-lime-400/10 rounded-lg">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNDA1NTU3ZDUuanN4 />
                    </div>
                    <div>
                      <h4 className="font-medium text-lg text-slate-900">
                        {"Email"}
                      </h4>
                      <p className="text-slate-600">{"hello@linklime.com"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-lime-400/10 rounded-lg">
                      <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfOTQ5YTMzZWEuanN4 />
                    </div>
                    <div>
                      <h4 className="font-medium text-lg text-slate-900">
                        {"Office"}
                      </h4>
                      <p className="text-slate-600">
                        {"123 SEO Street, San Francisco, CA"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  opacity: "0",
                  transform: "translateX(20px) translateZ(0)",
                }}
              >
                <form className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="text-2xl font-semibold mb-6 text-slate-900">
                    {"Send us a message"}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label
                        className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm font-medium text-slate-700"
                        htmlFor="name"
                      >
                        {"Full name"}
                      </label>
                      <input
                        type="text"
                        className="flex h-10 w-full rounded-md border border-input bg-background/30 px-3 py-2 text-sm caret-primary ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                        required
                        id="name"
                        name="fullname"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label
                        className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm font-medium text-slate-700"
                        htmlFor="contact-email"
                      >
                        {"Work email"}
                      </label>
                      <input
                        type="email"
                        className="flex h-10 w-full rounded-md border border-input bg-background/30 px-3 py-2 text-sm caret-primary ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                        required
                        id="contact-email"
                        name="contact-email"
                        placeholder="you@company.com"
                      />
                    </div>
                    <div>
                      <label
                        className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm font-medium text-slate-700"
                        htmlFor="website"
                      >
                        {"Website URL"}
                      </label>
                      <input
                        type="url"
                        className="flex h-10 w-full rounded-md border border-input bg-background/30 px-3 py-2 text-sm caret-primary ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                        required
                        id="website"
                        name="website"
                        placeholder="https://your-website.com"
                      />
                    </div>
                    <div>
                      <label
                        className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm font-medium text-slate-700"
                        htmlFor="message"
                      >
                        {"How can we help?"}
                      </label>
                      <textarea
                        className="flex w-full rounded-md border border-input bg-background/30 px-3 py-2 text-sm caret-primary ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1 min-h-[120px]"
                        required
                        id="message"
                        name="message"
                        placeholder="Tell us about your SEO goals..."
                      />
                    </div>
                    <button
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full bg-lime-500 hover:bg-lime-600 text-white"
                      type="submit"
                    >
                      {"Get in touch"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-lime-500 text-white">
                  <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNGQ1ZmE3ZjIuanN4 />
                </div>
                <span className="font-semibold text-lg">{"Linklime"}</span>
              </div>
              <p className="text-slate-600 text-sm mb-4">
                {
                  "Supercharge your SEO with AI-powered optimization tools and insights."
                }
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{"Product"}</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#features"
                    className="text-slate-600 hover:text-lime-600 text-sm"
                  >
                    {"Features"}
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-slate-600 hover:text-lime-600 text-sm"
                  >
                    {"Pricing"}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-600 hover:text-lime-600 text-sm"
                  >
                    {"Case Studies"}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-600 hover:text-lime-600 text-sm"
                  >
                    {"Documentation"}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{"Company"}</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-slate-600 hover:text-lime-600 text-sm"
                  >
                    {"About Us"}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-600 hover:text-lime-600 text-sm"
                  >
                    {"Blog"}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-600 hover:text-lime-600 text-sm"
                  >
                    {"Careers"}
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="text-slate-600 hover:text-lime-600 text-sm"
                  >
                    {"Contact"}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{"Legal"}</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    className="text-slate-600 hover:text-lime-600 text-sm"
                    data-discover="true"
                    href="/privacy"
                  >
                    {"Privacy Policy"}
                  </a>
                </li>
                <li>
                  <a
                    className="text-slate-600 hover:text-lime-600 text-sm"
                    data-discover="true"
                    href="/terms"
                  >
                    {"Terms of Service"}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-600 hover:text-lime-600 text-sm"
                  >
                    {"Cookie Policy"}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-slate-500 mb-4 md:mb-0">
              {"© "}
              {"2025"}
              {" Linklime AI. All rights reserved."}
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-slate-500 hover:text-lime-600">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfNTdlNTVkNWYuanN4 />
              </a>
              <a href="#" className="text-slate-500 hover:text-lime-600">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfODNlNjM1OTkuanN4 />
              </a>
              <a href="#" className="text-slate-500 hover:text-lime-600">
                <Components.dGVtcGxhdGUvc3JjL2NvbXBvbmVudHMvc3Zncy9TdmdfYzk0MjUxYmEuanN4 />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </>
);
