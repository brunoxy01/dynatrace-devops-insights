import React from "react";
import { Page } from "@dynatrace/strato-components/layouts";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { FilterBar } from "./components/FilterBar";
import { Overview } from "./pages/Overview";
import { Developers } from "./pages/Developers";
import { Repositories } from "./pages/Repositories";
import { PullRequests } from "./pages/PullRequests";
import { Builds } from "./pages/Builds";
import { ReleaseComparison } from "./pages/ReleaseComparison";
import { FilterProvider } from "./state/FilterContext";
import { TimeRangeProvider } from "./state/TimeRangeContext";
import { ToastContainer } from "@dynatrace/strato-components/notifications";
import "./styles/animations.css";

export const App = () => {
  return (
    <TimeRangeProvider>
      <FilterProvider>
        <Page>
          <Page.Header>
            <Header />
          </Page.Header>
          <Page.Main>
            <FilterBar />
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/releases" element={<ReleaseComparison />} />
              <Route path="/developers" element={<Developers />} />
              <Route path="/repositories" element={<Repositories />} />
              <Route path="/pull-requests" element={<PullRequests />} />
              <Route path="/builds" element={<Builds />} />
            </Routes>
          </Page.Main>
        </Page>
      </FilterProvider>
      <ToastContainer />
    </TimeRangeProvider>
  );
};
