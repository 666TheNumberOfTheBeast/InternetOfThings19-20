import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.UUID;

// Launch the program with GUI
public class GUImain extends JFrame {
    private JButton start, stop, pause, resume;
    private JTextArea textArea;
    private MyListener listener;
    private VirtualEnvironmentStation ves;

    public GUImain() {
        super("Assignment 1 - Virtual Environment Station");

        Container c = this.getContentPane();
        textArea = new JTextArea();
        JScrollPane scrollPane = new JScrollPane(textArea);
        new SmartScroller(scrollPane);
        JPanel btnPanel = new JPanel();
        start = new JButton("Start");
        stop = new JButton("Stop");
        pause = new JButton("Pause");
        resume = new JButton("Resume");
        listener = new MyListener();

        c.setLayout(new BorderLayout());
        c.add(scrollPane, BorderLayout.CENTER);
        c.add(btnPanel, BorderLayout.SOUTH);

        //textArea.setPreferredSize(new Dimension(1024,668));
        textArea.setEditable(false);
        textArea.setLineWrap(true);
        textArea.setWrapStyleWord(true);
        textArea.setFont(textArea.getFont().deriveFont(20f)); // will only change size to 20pt

        scrollPane.setPreferredSize(new Dimension(1024,668));
        //scrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_ALWAYS);

        btnPanel.add(start);
        btnPanel.add(stop);
        btnPanel.add(pause);
        btnPanel.add(resume);

        //btnPanel.setPreferredSize(new Dimension(1024, 100));

        start.addActionListener(listener);
        stop.addActionListener(listener);
        pause.addActionListener(listener);
        resume.addActionListener(listener);

        stop.setEnabled(false);
        pause.setEnabled(false);
        resume.setEnabled(false);

        start.setFont(start.getFont().deriveFont(24f));
        stop.setFont(start.getFont());
        pause.setFont(start.getFont());
        resume.setFont(start.getFont());

        pack();
        setLocationRelativeTo(null);
        setVisible(true);
        setDefaultCloseOperation(EXIT_ON_CLOSE);
    }


    class MyListener implements ActionListener {
        public void actionPerformed(ActionEvent event) {
            JButton b = (JButton) event.getSource();
            switch (b.getText()) {
                case "Start":
                    start.setEnabled(false);
                    stop.setEnabled(true);
                    pause.setEnabled(true);
                    resume.setEnabled(false);

                    textArea.setText("");

                    String uniqueID = UUID.randomUUID().toString();
                    ves = new VirtualEnvironmentStation(uniqueID, textArea);
                    System.out.println("New Virtual Environment Station started with id = " + uniqueID);
                    Thread t = new Thread(ves);
                    t.start();
                    break;
                case "Stop":
                    stop.setEnabled(false);
                    pause.setEnabled(false);
                    resume.setEnabled(false);
                    start.setEnabled(true);
                    System.out.println("Stopped");
                    ves.stop();
                    break;
                case "Pause":
                    pause.setEnabled(false);
                    resume.setEnabled(true);
                    System.out.println("Paused");
                    ves.stop();
                    break;
                case "Resume":
                    resume.setEnabled(false);
                    pause.setEnabled(true);
                    System.out.println("Resumed");
                    ves.resume();
                    break;
                default:

            }
        }
    }

    public static void main(String[] args) {
        new GUImain();
    }

}