package org.msproject2xml;

import java.io.File;
import org.mpxj.ProjectFile;
import org.mpxj.mpp.MPPReader;
import org.mpxj.mspdi.MSPDIWriter;
import org.mpxj.reader.ProjectReader;
import org.mpxj.reader.UniversalProjectReader;
import org.mpxj.reader.UniversalProjectReader.ProjectReaderProxy;

public final class Convert {

    private Convert() {}

    public static void main(String[] args) {
        if (args.length < 1 || args.length > 2) {
            System.err.println("Usage: mpxj-convert <input> [output.xml]");
            System.exit(2);
        }

        File input = new File(args[0]);
        if (!input.isFile()) {
            System.err.println("Input not found: " + args[0]);
            System.exit(2);
        }

        File output = args.length == 2
            ? new File(args[1])
            : new File(stripExt(input.getPath()) + ".xml");

        try (ProjectReaderProxy proxy = new UniversalProjectReader().getProjectReaderProxy(input)) {
            if (proxy == null) {
                System.err.println("Unsupported or unreadable input format: " + args[0]);
                System.exit(1);
            }

            configureReader(proxy.getProjectReader());

            ProjectFile project = proxy.read();
            if (project == null) {
                System.err.println("Unsupported or unreadable input format: " + args[0]);
                System.exit(1);
            }
            MSPDIWriter writer = new MSPDIWriter();
            writer.setWriteTimephasedData(true);
            writer.write(project, output);
        } catch (Exception e) {
            System.err.println("Conversion failed: " + e.getMessage());
            System.exit(1);
        }
    }

    /**
     * Reading MPP presentation data (Gantt chart fonts and colours) initialises
     * java.awt.Color, which loads the AWT Toolkit and makes the GraalVM native
     * image dlopen libawt.so — absent on any machine without a JDK, which is
     * every machine we ship to. MSPDI output carries no presentation data, so
     * this costs us nothing.
     */
    private static void configureReader(ProjectReader reader) {
        if (reader instanceof MPPReader) {
            ((MPPReader) reader).setReadPresentationData(false);
        }
    }

    private static String stripExt(String path) {
        int dot = path.lastIndexOf('.');
        int sep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        return dot > sep ? path.substring(0, dot) : path;
    }
}
